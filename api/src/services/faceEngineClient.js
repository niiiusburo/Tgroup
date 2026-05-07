"use strict";

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://face-service:8000";

class FaceEngineError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function getEmbedding(imageBuffer, mimeType) {
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" });
  form.append("image", blob, "face.jpg");

  const res = await fetch(`${FACE_SERVICE_URL}/embed`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = data.error || "ENGINE_ERROR";
    const message = data.message || `Face service error (${res.status})`;
    throw new FaceEngineError(code, message, res.status);
  }

  return {
    embedding: data.embedding,
    model: data.model,
    quality: data.quality,
  };
}

async function healthCheck() {
  const res = await fetch(`${FACE_SERVICE_URL}/health`, { method: "GET" });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: await res.json() };
}

module.exports = {
  getEmbedding,
  healthCheck,
  FaceEngineError,
};
