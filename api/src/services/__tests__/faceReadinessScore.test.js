'use strict';

const { buildFaceReadiness } = require('../faceReadinessScore');

describe('buildFaceReadiness', () => {
  it('scores one registered provider sample as 33 percent readiness', () => {
    const result = buildFaceReadiness({ registered: true, sampleCount: 1 });

    expect(result).toMatchObject({
      score: 33,
      label: 'needs_retake',
      targetSampleCount: 3,
      sampleCoverage: 0.3333,
      storedQuality: null,
      recommendedAction: 'capture_more_angles',
      scoringVersion: 'face-readiness-0.32.55',
    });
  });

  it('scores three registered provider samples as excellent readiness', () => {
    const result = buildFaceReadiness({ registered: true, sampleCount: 3 });

    expect(result.score).toBe(100);
    expect(result.label).toBe('excellent');
    expect(result.recommendedAction).toBe('ready');
  });

  it('blends local stored detection quality when it is available', () => {
    const result = buildFaceReadiness({
      registered: true,
      sampleCount: 2,
      avgDetectionScore: 0.95,
    });

    expect(result.score).toBe(77);
    expect(result.label).toBe('good');
    expect(result.storedQuality).toBe(0.95);
  });

  it('returns zero readiness when the customer is not registered', () => {
    const result = buildFaceReadiness({ registered: false, sampleCount: 0 });

    expect(result.score).toBe(0);
    expect(result.label).toBe('not_registered');
    expect(result.recommendedAction).toBe('register');
  });
});
