'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/routes/patient/media.js, api/src/routes/media.js]
 * @crossref:uses[MEDIA_SERVICE_URL, MEDIA_SERVICE_API_KEY, dbo.partners]
 * Shared NK Photo integration: client lookup, upload, normalize, merge.
 * Keeps the external API key server-side and out of the mobile app.
 */

function getMediaConfig() {
  return {
    url: (process.env.MEDIA_SERVICE_URL || '').replace(/\/$/, ''),
    apiKey: process.env.MEDIA_SERVICE_API_KEY || '',
  };
}

function mediaHeaders() {
  return { 'X-API-Key': getMediaConfig().apiKey };
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function loadPartner(db, partnerId) {
  const rows = await db(
    `SELECT id, ref, name, phone, email
     FROM dbo.partners
     WHERE id = $1 AND customer = true AND COALESCE(isdeleted, false) = false`,
    [partnerId]
  );
  return rows && rows[0] ? rows[0] : null;
}

function searchKeysForPartner(partner) {
  return [partner.id, partner.ref, partner.phone].filter(Boolean);
}

async function searchMediaClient(partner) {
  const { url } = getMediaConfig();
  for (const key of searchKeysForPartner(partner)) {
    const res = await fetch(`${url}/api/clients?search=${encodeURIComponent(String(key))}`, {
      headers: mediaHeaders(),
    });
    if (!res.ok) continue;
    const data = await readJson(res);
    const client = data?.client || (Array.isArray(data?.clients) ? data.clients[0] : null);
    if (client?.id) return { id: client.id };
  }
  return null;
}

async function createMediaClient(partner) {
  const { url } = getMediaConfig();
  const res = await fetch(`${url}/api/clients`, {
    method: 'POST',
    headers: {
      ...mediaHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_ref: partner.id,
      ref: partner.ref,
      name: partner.name,
      phone: partner.phone,
      email: partner.email,
    }),
  });

  const data = await readJson(res);
  if (!res.ok || !data?.client?.id) {
    const err = new Error(data?.error || data?.raw || 'Media client creation failed');
    err.status = res.status || 502;
    throw err;
  }
  return { id: data.client.id };
}

async function getOrCreateMediaClient(partner) {
  const found = await searchMediaClient(partner);
  if (found) return found;
  return createMediaClient(partner);
}

function normalizeMediaItem(item) {
  const mediaServiceId = item.media_service_id || item.id;
  const category = item.category || item.type || 'general';
  return {
    ...item,
    id: item.id || mediaServiceId,
    media_service_id: mediaServiceId,
    media_url: item.media_url || item.url,
    signedUrl: item.signedUrl || item.signed_url,
    signedUrlExpiresAt: item.signedUrlExpiresAt || item.signed_url_expires_at,
    category,
    type: item.type || category,
    saleOrderLineId: item.sale_order_line_id || item.saleOrderLineId || null,
  };
}

function mergeMediaRows(externalRows, localRows) {
  const seen = new Set();
  const merged = [];

  for (const row of externalRows.map(normalizeMediaItem)) {
    const key = row.media_service_id || row.id;
    if (key) seen.add(String(key));
    merged.push(row);
  }

  for (const row of (localRows || []).map(normalizeMediaItem)) {
    const key = row.media_service_id || row.id;
    if (key && seen.has(String(key))) continue;
    if (key) seen.add(String(key));
    merged.push(row);
  }

  return merged;
}

async function listExternalMedia(clientId) {
  const { url } = getMediaConfig();
  const res = await fetch(`${url}/api/clients/${encodeURIComponent(clientId)}/media`, {
    headers: mediaHeaders(),
  });
  if (!res.ok) return [];
  const data = await readJson(res);
  return Array.isArray(data?.media) ? data.media : [];
}

async function uploadExternalMedia(clientId, file, fields) {
  const { url } = getMediaConfig();
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
  form.append('file', blob, file.originalname || 'patient-media');
  form.append('type', fields.type || fields.category || 'general');
  if (fields.label) form.append('label', fields.label);

  const res = await fetch(`${url}/api/clients/${encodeURIComponent(clientId)}/media`, {
    method: 'POST',
    headers: mediaHeaders(),
    body: form,
  });
  const data = await readJson(res);
  if (!res.ok || !data?.media) {
    const err = new Error(data?.error || data?.raw || 'Media upload failed');
    err.status = res.status || 502;
    throw err;
  }
  return normalizeMediaItem(data.media);
}

module.exports = {
  getMediaConfig,
  mediaHeaders,
  readJson,
  loadPartner,
  searchKeysForPartner,
  searchMediaClient,
  createMediaClient,
  getOrCreateMediaClient,
  normalizeMediaItem,
  mergeMediaRows,
  listExternalMedia,
  uploadExternalMedia,
};
