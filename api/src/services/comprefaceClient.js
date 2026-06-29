const COMPREFACE_URL = (process.env.COMPREFACE_URL || 'http://compreface-api').replace(/\/$/, '');
const COMPREFACE_API_KEY = process.env.COMPREFACE_API_KEY || '';
const DET_PROB_THRESHOLD = process.env.COMPREFACE_DET_PROB_THRESHOLD || process.env.FACE_DET_PROB_THRESHOLD || '0.75';

class ComprefaceClientError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'ComprefaceClientError';
    this.code = code;
    this.status = status;
  }
}

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
  const params = new URLSearchParams({
    limit: '0',
    prediction_count: '2',
    det_prob_threshold: DET_PROB_THRESHOLD,
  });

  const data = await comprefaceFetch(`/recognize?${params.toString()}`, {
    method: 'POST',
    body: form,
  });

  const results = data?.result || [];
  if (results.length > 1) {
    throw new ComprefaceClientError(
      'MULTIPLE_FACES',
      'More than one face detected',
      422
    );
  }

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
  // Enforce the same detection-probability floor at enrollment as at
  // recognition: a blurry/low-light enrollment photo pollutes the subject's
  // gallery and makes cross-person collisions more likely later.
  const params = new URLSearchParams({
    subject: subjectId,
    det_prob_threshold: DET_PROB_THRESHOLD,
  });

  return comprefaceFetch(`/faces?${params.toString()}`, {
    method: 'POST',
    body: form,
  });
}

/**
 * List saved face examples for a subject.
 * @param {string} subjectId
 * @returns {Promise<{faces: unknown[], total: number}>}
 */
async function listFaces(subjectId) {
  const data = await comprefaceFetch(`/faces?subject=${encodeURIComponent(subjectId)}`, {
    method: 'GET',
  });

  const faces = Array.isArray(data?.faces)
    ? data.faces
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.result)
        ? data.result
        : [];
  const total = Number(data?.total_elements ?? data?.total ?? faces.length);
  return {
    faces,
    total: Number.isFinite(total) ? total : faces.length,
  };
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
  listFaces,
  deleteSubject,
  healthCheck,
  ComprefaceClientError,
};
