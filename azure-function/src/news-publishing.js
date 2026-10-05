const { requireAdministrator } = require('./identity');
const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const model = require('./news-model');
const MAX_BODY_BYTES = Math.ceil(model.MAX_PDF_BYTES / 3) * 4 + 8192;
const target = Object.freeze({ owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository });
const metadataPaths = Object.freeze({ publications: '_content/publications.json', news: '_content/news.json' });
const response = (status, jsonBody) => ({ status, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' }, jsonBody });
const failure = (status, error) => response(status, { ok: false, error });
async function readJson(request, maximum) {
  if (Number(request.headers?.get('content-length')) > maximum) throw new RangeError();
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers?.get('content-type') || '')) throw new SyntaxError();
  const reader = request.body?.getReader(); if (!reader) throw new SyntaxError();
  let size = 0; const chunks = [];
  try { for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > maximum) { await reader.cancel(); throw new RangeError(); } chunks.push(Buffer.from(next.value)); } }
  finally { reader.releaseLock(); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}
async function file(client, path, ref) {
  const result = (await client.rest.repos.getContent({ ...target, path, ref })).data;
  if (result?.type !== 'file' || result.path !== path || !model.shaValid(result.sha) || result.encoding !== 'base64' || typeof result.content !== 'string' || result.content.length > model.MAX_METADATA_BYTES * 1.5) throw new Error('invalid-file');
  const bytes = Buffer.from(result.content, 'base64'); if (bytes.length > model.MAX_METADATA_BYTES) throw new Error('invalid-file');
  return { sha: result.sha, data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
}
function createNewsPublishingHandler(kind, { env = process.env, readConfiguration = readGithubConfiguration, createClient = (configuration, permission) => createInstallationClient(configuration, undefined, permission) } = {}) {
  if (!Object.hasOwn(metadataPaths, kind)) throw new Error('invalid-handler-kind');
  return async request => {
    const denied = requireAdministrator(request); if (denied) return denied;
    if (!['GET', 'POST'].includes(request.method)) return failure(405, 'method-not-allowed');
    if (request.query && [...request.query.keys()].length) return failure(400, 'invalid-news-request');
    let body, upload, article;
    if (request.method === 'POST') {
      try {
        body = await readJson(request, kind === 'publications' ? MAX_BODY_BYTES : model.MAX_METADATA_BYTES);
        if (kind === 'publications') upload = model.publication(body);
        else {
          model.keys(body, ['sha', 'headSha', 'originalSlug', 'article']);
          if (!model.shaValid(body.sha) || !model.shaValid(body.headSha) || !(body.originalSlug === null || (typeof body.originalSlug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.originalSlug)))) throw new Error('invalid-version');
          article = model.story(body.article);
          if (body.originalSlug !== null && body.originalSlug !== article.slug) throw new Error('immutable-slug');
        }
      } catch (error) { return failure(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'news-payload-too-large' : 'invalid-news-request'); }
    }
    let configuration, client, headSha, current;
    try {
      configuration = readConfiguration(env); client = await createClient(configuration, 'read');
      headSha = (await client.rest.git.getRef({ ...target, ref: 'heads/Dev' })).data.object.sha;
      if (!model.shaValid(headSha)) throw new Error('invalid-head');
      current = await file(client, metadataPaths[kind], headSha); model.validateExisting(current.data, kind);
    } catch { return failure(502, 'news-repository-unavailable'); }
    if (request.method === 'GET') return response(200, { ok: true, sha: current.sha, headSha, ...current.data });
    if (body.sha !== current.sha || body.headSha !== headSha) return failure(409, 'news-version-conflict');
    if (kind === 'publications') {
      if (current.data.publications.some(item => item.id === upload.record.id || item.pdf === upload.record.pdf || (item.type === upload.record.type && (item.type === 'parish-magazine' ? item.date.slice(0, 7) === upload.record.date.slice(0, 7) : item.date === upload.record.date)))) return failure(409, 'publication-already-exists');
      try { await client.rest.repos.getContent({ ...target, path: upload.record.pdf, ref: headSha }); return failure(409, 'publication-already-exists'); }
      catch (error) { if (error.status !== 404) return failure(502, 'news-repository-unavailable'); }
      current.data.publications.push(upload.record);
    } else {
      const index = current.data.articles.findIndex(item => item.slug === article.slug);
      if ((body.originalSlug === null && index >= 0) || (body.originalSlug !== null && index < 0)) return failure(409, 'news-version-conflict');
      if (article.image) {
        try { const image = (await client.rest.repos.getContent({ ...target, path: article.image, ref: headSha })).data; if (image.type !== 'file' || image.path !== article.image) throw new Error(); }
        catch { return failure(400, 'invalid-news-request'); }
      }
      if (index < 0) current.data.articles.push(article); else current.data.articles[index] = article;
    }
    try { model.validateExisting(current.data, kind); } catch { return failure(413, 'news-payload-too-large'); }
    try {
      const writer = await createClient(configuration, 'write');
      const parent = (await writer.rest.git.getCommit({ ...target, commit_sha: headSha })).data;
      const tree = [];
      if (upload) {
        const blob = (await writer.rest.git.createBlob({ ...target, content: upload.pdf.toString('base64'), encoding: 'base64' })).data;
        if (!model.shaValid(blob.sha)) throw new Error();
        tree.push({ path: upload.record.pdf, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const text = `${JSON.stringify(current.data, null, 2)}\n`;
      const metadata = (await writer.rest.git.createBlob({ ...target, content: Buffer.from(text).toString('base64'), encoding: 'base64' })).data;
      if (!model.shaValid(metadata.sha) || !model.shaValid(parent.tree?.sha)) throw new Error();
      tree.push({ path: metadataPaths[kind], mode: '100644', type: 'blob', sha: metadata.sha });
      const nextTree = (await writer.rest.git.createTree({ ...target, base_tree: parent.tree.sha, tree })).data;
      if (!model.shaValid(nextTree.sha)) throw new Error();
      const message = upload ? `Publish ${upload.record.type === 'pews-news' ? 'Pews News' : 'Parish Magazine'} ${upload.record.date}` : `${article.status === 'draft' ? 'Save draft' : 'Publish'} website news: ${article.title}`;
      const commit = (await writer.rest.git.createCommit({ ...target, message, tree: nextTree.sha, parents: [headSha] })).data;
      if (!model.shaValid(commit.sha)) throw new Error();
      // Non-forced ref update only fast-forwards the exact parent used above.
      // Competing commits produce sibling trees, so only one can become Dev.
      await writer.rest.git.updateRef({ ...target, ref: 'heads/Dev', sha: commit.sha, force: false });
      return response(200, { ok: true, sha: metadata.sha, headSha: commit.sha, commitSha: commit.sha });
    } catch (error) { return failure([409, 422].includes(error?.status) ? 409 : 502, [409, 422].includes(error?.status) ? 'news-version-conflict' : 'news-publish-unavailable'); }
  };
}
module.exports = { createNewsPublishingHandler, MAX_BODY_BYTES, metadataPaths, readJson };
