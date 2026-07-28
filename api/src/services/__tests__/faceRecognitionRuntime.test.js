"use strict";

jest.mock("../faceEngineClient", () => ({
  healthCheck: jest.fn(),
}));

jest.mock("../comprefaceClient", () => ({
  healthCheck: jest.fn(),
}));

const { healthCheck: faceServiceHealth } = require("../faceEngineClient");
const { healthCheck: comprefaceHealth } = require("../comprefaceClient");
const { healthCheck } = require("../faceRecognitionRuntime");

const originalProvider = process.env.FACE_RECOGNITION_PROVIDER;

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  if (originalProvider === undefined) {
    delete process.env.FACE_RECOGNITION_PROVIDER;
  } else {
    process.env.FACE_RECOGNITION_PROVIDER = originalProvider;
  }
});

it.each([
  ["local", faceServiceHealth],
  ["compreface", comprefaceHealth],
])("bounds a never-settling %s health probe", async (provider, providerHealth) => {
  jest.useFakeTimers();
  process.env.FACE_RECOGNITION_PROVIDER = provider;
  providerHealth.mockReturnValueOnce(new Promise(() => {}));

  const resultPromise = healthCheck();
  await jest.runOnlyPendingTimersAsync();

  await expect(resultPromise).resolves.toEqual({
    ok: false,
    status: 0,
    message: "Face recognition health check timed out after 2000ms",
    provider,
  });
});
