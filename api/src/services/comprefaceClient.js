/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[NK3 backend service function: api/src/services/comprefaceClient]
 * @crossref:uses[product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const COMPREFACE_URL = (process.env.COMPREFACE_URL || 'http://compreface-api').replace(/\/$/, '');
const COMPREFACE_API_KEY = process.env.COMPREFACE_API_KEY || '';

async function comprefaceFetch(path, options = {}) {
  const url = `${COMPREFACE_URL}/api/v1/recognition${path}`;
  const headers = {
    'x-api-key': COMPREFACE_API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // leave json null
  }

  if (!res.ok) {
    const err = new Error(json?.message || text || `Compreface error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return json;
}

function createImageForm(imageBuffer, mimetype, fields = {}) {
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: mimetype });
  form.append('file', blob, 'face.jpg');
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, value);
  });
  return form;
}

/**
 * Recognize a face in an image buffer.
 * @param {Buffer} imageBuffer
 * @param {string} [mimetype='image/jpeg']
 * @returns {Promise<Array<{subject: string, similarity: number}>>}
 */
async function recognize(imageBuffer, mimetype = 'image/jpeg') {
  const form = createImageForm(imageBuffer, mimetype);

  const data = await comprefaceFetch('/recognize', {
    method: 'POST',
    body: form,
  });

  const results = data?.result || [];
  return results
    .flatMap((r) => r.subjects || [])
    .map((s) => ({ subject: s.subject, similarity: parseFloat(s.similarity) }))
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Create a new subject.
 * @param {string} subjectId
 */
async function createSubject(subjectId) {
  return comprefaceFetch('/subjects', {
    method: 'POST',
    body: JSON.stringify({ subject: subjectId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Add a face example to a subject.
 * @param {string} subjectId
 * @param {Buffer} imageBuffer
 * @param {string} [mimetype='image/jpeg']
 */
async function addExample(subjectId, imageBuffer, mimetype = 'image/jpeg') {
  const form = createImageForm(imageBuffer, mimetype, { subject: subjectId });

  return comprefaceFetch('/faces', {
    method: 'POST',
    body: form,
  });
}

/**
 * Delete a subject and all its examples.
 * @param {string} subjectId
 */
async function deleteSubject(subjectId) {
  return comprefaceFetch(`/subjects/${encodeURIComponent(subjectId)}`, {
    method: 'DELETE',
  });
}

async function healthCheck() {
  if (!COMPREFACE_API_KEY) {
    return { ok: false, status: 0, message: 'COMPREFACE_API_KEY is not configured' };
  }

  try {
    await comprefaceFetch('/subjects', { method: 'GET' });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      status: err.status || 0,
      message: err.message || 'Compreface health check failed',
    };
  }
}

module.exports = {
  recognize,
  createSubject,
  addExample,
  deleteSubject,
  healthCheck,
};
