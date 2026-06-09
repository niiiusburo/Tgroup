"use strict";

/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[NK3 backend service function: api/src/services/faceRecognitionRuntime]
 * @crossref:uses[product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
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
