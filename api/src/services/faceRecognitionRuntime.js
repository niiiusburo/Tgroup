"use strict";

const { healthCheck: faceServiceHealth } = require("./faceEngineClient");
const { healthCheck: comprefaceHealth } = require("./comprefaceClient");

const FACE_HEALTH_TIMEOUT_MS = 2000;

function getFaceRecognitionProvider() {
  const raw = String(
    process.env.FACE_RECOGNITION_PROVIDER || process.env.FACE_ENGINE || "local"
  ).trim().toLowerCase();
  return raw === "compreface" ? "compreface" : "local";
}

async function healthCheck() {
  const provider = getFaceRecognitionProvider();
  const controller = new AbortController();
  let timeoutId;
  const timeoutResult = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        ok: false,
        status: 0,
        message: `Face recognition health check timed out after ${FACE_HEALTH_TIMEOUT_MS}ms`,
      });
      controller.abort();
    }, FACE_HEALTH_TIMEOUT_MS);
  });

  let result;
  try {
    result = await Promise.race([
      provider === "compreface"
        ? comprefaceHealth(controller.signal)
        : faceServiceHealth(controller.signal),
      timeoutResult,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    ...result,
    provider,
  };
}

module.exports = {
  getFaceRecognitionProvider,
  healthCheck,
};
