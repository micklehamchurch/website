const { readGithubConfiguration, createInstallationClient, EXPECTED_TARGET } = require('./github-status');
const { fetchGoogleCalendar, fingerprint } = require('./google-calendar-adapter');
const { reconcile, validateRegistry } = require('./google-calendar-sync-model');
const { createBlobSyncStore } = require('./google-sync-store');
const PATHS = Object.freeze({ calendar: '_content/calendar.json', registry: '_sync/google-calendar.json' });
const SCHEDULE = '0 0 * * * *';
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const error = (code, status = 502) => Object.assign(Error(code), { code, status });
const counts = report => ({ added: report.additions.length, updated: report.updates.length, removed: report.removals.length, unchanged: report.unchanged.length });
function observeMissing(registry, feed, state, at) {
  const present = new Set(feed.rows.map(r => r.key));
  const slot = Math.floor(Date.parse(at) / 3600000), observations = {};
  for (const e of registry.entries) if (!e.suppressed && !present.has(e.key)) {
    const prior = state.observations[e.key];
    observations[e.key] = { slot, count: prior?.slot === slot ? prior.count : prior?.slot === slot - 1 ? Math.min(3, prior.count + 1) : 1 };
  }
  return observations;
}
function publicStatus(state) {
  return { automaticSynchronization: 'on', cadence: 'Checks approximately hourly', lastAutomatic: state.lastAutomatic, lastSuccessfulAutomatic: state.lastSuccessfulAutomatic, lastCalendarUpdate: state.lastCalendarUpdate };
}
function createGoogleSyncService({ env = process.env, readConfiguration = readGithubConfiguration, createClient = (c,p) => createInstallationClient(c,undefined,p), fetchFeed = fetchGoogleCalendar, now = () => new Date().toISOString(), store = createBlobSyncStore({env}) } = {}) {
  const target = { owner: EXPECTED_TARGET.owner, repo: EXPECTED_TARGET.repository };
  async function snapshot() {
    try {
      const config = readConfiguration(env), client = await createClient(config, 'read');
      const headSha = (await client.rest.git.getRef({...target,ref:'heads/Dev'})).data.object.sha;
      if (!sha(headSha)) throw Error();
      async function read(path,max) {
        const file = (await client.rest.repos.getContent({...target,path,ref:headSha})).data;
        if (file.type !== 'file' || file.path !== path || file.encoding !== 'base64' || !sha(file.sha) || typeof file.content !== 'string' || file.content.length > max * 1.5) throw Error();
        const bytes = Buffer.from(file.content,'base64'); if (bytes.length > max) throw Error();
        return {sha:file.sha,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
      }
      const c = await read(PATHS.calendar,256*1024), r = await read(PATHS.registry,1024*1024);
      validateRegistry(r.value);
      return {config,headSha,calendarSha:c.sha,registrySha:r.sha,calendar:c.value,registry:r.value};
    } catch { throw error('sync-repository-unavailable'); }
  }
  async function prepare(current, runtime, automatic = false, at = now()) {
    try {
      const feed = await fetchFeed();
      if (!feed.rows?.length) throw Error();
      const observations = automatic ? observeMissing(current.registry,feed,runtime,at) : runtime.observations;
      const plan = reconcile(current.calendar,current.registry,feed,{stage2:true,observations,previousCount:runtime.lastValidatedCount});
      return {feed,plan,observations,at,reviewDigest:fingerprint({feed:feed.fingerprint,report:plan.report,calendarSha:current.calendarSha,registrySha:current.registrySha})};
    } catch { throw error('google-feed-unavailable'); }
  }
  function review(current, prepared) {
    const {plan,at,reviewDigest} = prepared;
    return {ok:true,headSha:current.headSha,calendarSha:current.calendarSha,registrySha:current.registrySha,reviewDigest,report:plan.report,calendarChanged:plan.calendarChanged,blocked:plan.blocked,lastSuccessfulSync:current.registry.lastSuccessfulSync||null,checkedAt:at,canApply:!plan.blocked&&plan.calendarChanged};
  }
  async function publish(current, prepared, guard, automatic = false) {
    const {plan} = prepared;
    if (plan.blocked) throw error('google-review-required',409);
    // Observation-only, local-override and audit changes must not deploy Pages.
    // Unpersisted local edits remain detectable against the accepted baseline.
    if (!plan.calendarChanged) return {...review(current,prepared),unchanged:true};
    await guard();
    try {
      const writer = await createClient(current.config,'write');
      if ((await writer.rest.git.getRef({...target,ref:'heads/Dev'})).data.object.sha !== current.headSha) throw error('sync-version-conflict',409);
      const parent = (await writer.rest.git.getCommit({...target,commit_sha:current.headSha})).data;
      if (!sha(parent.tree?.sha)) throw Error();
      plan.registry.lastSuccessfulSync = now();
      plan.registry.audit = {at:now(),mode:automatic?'automatic':'manual',...counts(plan.report),missing:plan.report.missing.length,conflicts:plan.report.conflicts.length,suppressed:plan.report.suppressed.length};
      const tree = []; let nextCalendarSha = current.calendarSha;
      for (const [path,value] of [[PATHS.calendar,plan.calendar],[PATHS.registry,plan.registry]]) {
        if (path === PATHS.calendar && !plan.calendarChanged) continue;
        const blob = (await writer.rest.git.createBlob({...target,content:Buffer.from(JSON.stringify(value,null,2)+'\n').toString('base64'),encoding:'base64'})).data;
        if (!sha(blob.sha)) throw Error();
        tree.push({path,mode:'100644',type:'blob',sha:blob.sha}); if (path === PATHS.calendar) nextCalendarSha = blob.sha;
      }
      const nextTree = (await writer.rest.git.createTree({...target,base_tree:parent.tree.sha,tree})).data;
      if (!sha(nextTree.sha)) throw Error();
      const commit = (await writer.rest.git.createCommit({...target,tree:nextTree.sha,parents:[current.headSha],message:automatic?'Synchronize safe Google Calendar changes (Dev)':'Apply reviewed Google Calendar updates (Dev)'})).data;
      if (!sha(commit.sha)) throw Error();
      await guard();
      await writer.rest.git.updateRef({...target,ref:'heads/Dev',sha:commit.sha,force:false});
      return {...review(current,prepared),calendarSha:nextCalendarSha,commitSha:commit.sha,headSha:commit.sha,lastSuccessfulSync:plan.registry.lastSuccessfulSync};
    } catch (e) { if (e.code === 'sync-version-conflict' || [409,422].includes(e.status)) throw error('sync-version-conflict',409); throw error('sync-publish-unconfirmed'); }
  }
  async function automatic() {
    return store.locked(async ({state,save,guard}) => {
      const at = now(); let current;
      try {
        current = await snapshot(); const prepared = await prepare(current,state,true,at);
        const {plan,feed,observations} = prepared;
        const result = plan.blocked ? null : await publish(current,prepared,guard,true);
        const needingReview = [...plan.report.missing,...plan.report.unsupported,...plan.report.conflicts,...(plan.blocked?plan.report.removals:[])];
        state.lastAutomatic = {at,result:plan.blocked?'needs-review':needingReview.length?'needs-review':result.calendarChanged?'updated':'up-to-date',...(plan.blocked?{added:0,updated:0,removed:0,unchanged:plan.report.unchanged.length}:counts(plan.report)),conflicts:plan.report.conflicts,needsReview:needingReview,warnings:plan.report.warnings,failure:null,headBefore:current.headSha,headAfter:result?.headSha||current.headSha,calendarChanged:!!result?.calendarChanged};
        if (!plan.blocked) {state.lastSuccessfulAutomatic=at;state.lastValidatedCount=feed.rows.length;state.observations=observations;}
        else state.observations = {};
        if (result?.calendarChanged) state.lastCalendarUpdate=at;
        else state.lastCalendarUpdate ||= current.registry.lastSuccessfulSync || null;
      } catch (e) {
        state.observations = {};
        state.lastAutomatic = {at,result:e.code==='sync-version-conflict'?'concurrent-change':'failed',added:0,updated:0,removed:0,unchanged:0,conflicts:[],needsReview:[],warnings:[],failure:({'sync-repository-unavailable':'The website repository could not be checked.','sync-version-conflict':'An editor changed Calendar during the check. Nothing was overwritten.','sync-publish-unconfirmed':'Publication could not be confirmed. Check the current Calendar before retrying.'})[e.code] || 'Google Calendar could not be safely checked. Published Calendar data was retained.',headBefore:current?.headSha||null,headAfter:null,calendarChanged:false};
      }
      // A storage outage after a successful publication must not relabel it as
      // a failed Google check or claim that the Calendar was never updated.
      await save(state);
      return publicStatus(state);
    });
  }
  return {snapshot,prepare,review,publish,automatic,store,now};
}
module.exports = { createGoogleSyncService, PATHS, SCHEDULE, sha, observeMissing, publicStatus };
