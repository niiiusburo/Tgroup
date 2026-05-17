"use strict";

const { healthCheck: faceServiceHealth } = require("./faceEngineClient");
const { healthCheck: comprefaceHealth } = require("./comprefaceClient");

function getFaceRecognitionProvider() {
  const raw = String(
    process.env.FACE_RECOGNITION_PROVIDER || process.env.FACE_ENGINE || "local"
  ).trim().toLowerCase();
  return raw === "compreface" ? "compreface" : "local";
}

async function healthCheck() {
  const provider = getFaceRecognitionProvider();
  const result = provider === "compreface"
    ? await comprefaceHealth()
    : await faceServiceHealth();

  return {
    ...result,
    provider,
  };
}

module.exports = {
  getFaceRecognitionProvider,
  healthCheck,
};
