const { BlobServiceClient } = require('@azure/storage-blob');
const { ManagedIdentityCredential } = require('@azure/identity');
const { SOURCE } = require('./google-calendar-adapter');
const CONTAINER = 'church-calendar-sync';
const BLOB = 'stage2-state.json';
const emptyState = () => ({ version: 2, source: SOURCE, observations: {}, lastAutomatic: null, lastSuccessfulAutomatic: null, lastCalendarUpdate: null, lastValidatedCount: null });
function validateState(value) {
  if (!value || value.version !== 2 || value.source !== SOURCE || !value.observations || typeof value.observations !== 'object' || Array.isArray(value.observations) || Object.keys(value.observations).length > 1000) throw Error('sync-state-invalid');
  for (const entry of Object.values(value.observations)) if (!entry || !Number.isSafeInteger(entry.count) || entry.count < 0 || entry.count > 3 || !Number.isSafeInteger(entry.slot)) throw Error('sync-state-invalid');
  return value;
}
function createBlobSyncStore({ env = process.env, service } = {}) {
  let container;
  function client() {
    if (!container) {
      if (!service) {
        // Existing host connection only. Credentials never leave the server.
        const options = {retryOptions:{maxTries:2,tryTimeoutInMs:10000}};
        if (env.AzureWebJobsStorage) service = BlobServiceClient.fromConnectionString(env.AzureWebJobsStorage, options);
        else {
          const endpoint = env.AzureWebJobsStorage__blobServiceUri || (env.AzureWebJobsStorage__accountName ? `https://${env.AzureWebJobsStorage__accountName}.blob.core.windows.net` : null);
          if (!endpoint || !/^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net\/?$/.test(endpoint)) throw Error('sync-storage-unavailable');
          const id = env.AzureWebJobsStorage__clientId;
          const credential = id ? new ManagedIdentityCredential({ clientId: id }) : new ManagedIdentityCredential();
          service = new BlobServiceClient(endpoint, credential, options);
        }
      }
      container = service.getContainerClient(CONTAINER);
    }
    return container;
  }
  async function read(blob = client().getBlockBlobClient(BLOB)) {
    try {
      const properties = await blob.getProperties();
      if (properties.contentLength > 1024 * 1024) throw Error('sync-state-invalid');
      const buffer = await blob.downloadToBuffer(0, properties.contentLength);
      return validateState(JSON.parse(buffer.toString('utf8')));
    } catch (error) { if (error.statusCode === 404) return emptyState(); throw error; }
  }
  async function locked(action) {
    const c = client();
    await c.createIfNotExists(); // SDK default is private; never enables public access.
    const blob = c.getBlockBlobClient(BLOB);
    try { const value = JSON.stringify(emptyState()); await blob.upload(value, Buffer.byteLength(value), { conditions: { ifNoneMatch: '*' } }); }
    catch (error) { if (![409, 412].includes(error.statusCode)) throw error; }
    const lease = blob.getBlobLeaseClient();
    try { await lease.acquireLease(60); }
    catch (error) { if (error.statusCode === 409) return { busy: true }; throw error; }
    let lost = false;
    const renewal = setInterval(() => { void lease.renewLease().catch(() => { lost = true; }); }, 20000);
    renewal.unref?.();
    try {
      const state = await read(blob);
      const guard = async () => { if (lost) throw Error('sync-lock-lost'); await lease.renewLease(); };
      const save = async value => {
        await guard(); validateState(value);
        const content = JSON.stringify(value);
        if (Buffer.byteLength(content) > 1024 * 1024) throw Error('sync-state-invalid');
        await blob.upload(content, Buffer.byteLength(content), { conditions: { leaseId: lease.leaseId }, blobHTTPHeaders: { blobContentType: 'application/json', blobCacheControl: 'no-store' } });
      };
      return await action({ state, save, guard });
    } finally { clearInterval(renewal); await lease.releaseLease().catch(() => {}); }
  }
  return { read, locked };
}
module.exports = { createBlobSyncStore, emptyState, validateState, CONTAINER, BLOB };
