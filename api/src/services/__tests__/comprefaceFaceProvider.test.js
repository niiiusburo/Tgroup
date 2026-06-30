'use strict';

jest.mock('../comprefaceClient', () => ({
  recognize: jest.fn(),
  createSubject: jest.fn(),
  addExample: jest.fn(),
  listFaces: jest.fn(),
  deleteSubject: jest.fn(),
}));

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const comprefaceClient = require('../comprefaceClient');
const { query } = require('../../db');
const provider = require('../comprefaceFaceProvider');

describe('comprefaceFaceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FACE_AUTO_MATCH_THRESHOLD;
    delete process.env.FACE_CANDIDATE_THRESHOLD;
    delete process.env.FACE_AUTO_MATCH_MARGIN;
    delete process.env.FACE_MAX_CANDIDATES;
  });

  it('maps a high-similarity Compreface subject to a customer match', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: 'partner-1', similarity: 0.93 },
    ]);
    query.mockResolvedValue([
      { id: 'partner-1', name: 'Alice', phone: '0901', code: 'T001', face_subject_id: 'partner-1' },
    ]);

    const result = await provider.recognizeFace(Buffer.from('face'), 'image/jpeg');

    expect(result.match.partnerId).toBe('partner-1');
    expect(result.match.confidence).toBe(0.93);
    expect(result.candidates).toEqual([]);
    expect(result.privateDiagnostics).toMatchObject({
      provider: 'compreface',
      reasonCode: 'AUTO_MATCH_SINGLE_CANDIDATE',
      candidatesConsidered: 1,
      topCandidates: [
        expect.objectContaining({ rank: 1, partnerId: 'partner-1', score: 0.93 }),
      ],
    });
  });

  it('returns candidates when the top score is plausible but below auto-match', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: 'partner-1', similarity: 0.84 },
    ]);
    query.mockResolvedValue([
      { id: 'partner-1', name: 'Alice', phone: '0901', code: 'T001', face_subject_id: 'partner-1' },
    ]);

    const result = await provider.recognizeFace(Buffer.from('face'), 'image/jpeg');

    expect(result.match).toBeNull();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].partnerId).toBe('partner-1');
    expect(result.privateDiagnostics).toMatchObject({
      reasonCode: 'CANDIDATE_BELOW_AUTO_THRESHOLD',
      rawProviderResults: 1,
      candidatesConsidered: 1,
    });
  });

  it('records private diagnostics when Compreface scores are ambiguous', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: 'partner-1', similarity: 0.86 },
      { subject: 'partner-2', similarity: 0.85 },
    ]);
    query.mockResolvedValue([
      { id: 'partner-1', name: 'Alice', phone: '0901', code: 'T001', face_subject_id: 'partner-1' },
      { id: 'partner-2', name: 'Bob', phone: '0902', code: 'T002', face_subject_id: 'partner-2' },
    ]);

    const result = await provider.recognizeFace(Buffer.from('face'), 'image/jpeg');

    expect(result.match).toBeNull();
    expect(result.candidates).toHaveLength(2);
    expect(result.privateDiagnostics).toMatchObject({
      reasonCode: 'AMBIGUOUS_MARGIN_TOO_SMALL',
      scoreMargin: 0.010000000000000009,
      topCandidates: [
        expect.objectContaining({ rank: 1, partnerId: 'partner-1', score: 0.86 }),
        expect.objectContaining({ rank: 2, partnerId: 'partner-2', score: 0.85 }),
      ],
    });
  });

  it('maps Compreface recognize no-face responses to NO_FACE instead of engine error', async () => {
    const err = new Error('No face detected');
    err.status = 400;
    comprefaceClient.recognize.mockRejectedValue(err);

    await expect(provider.recognizeFace(Buffer.from('face'), 'image/jpeg')).rejects.toMatchObject({
      code: 'NO_FACE',
      status: 422,
      message: 'No face detected',
    });
  });

  it('creates a subject, adds an example, and marks partner face status', async () => {
    comprefaceClient.createSubject.mockResolvedValue({ subject: 'partner-1' });
    comprefaceClient.addExample.mockResolvedValue({ image_id: 'img-1' });
    comprefaceClient.listFaces.mockResolvedValue({ faces: [{ image_id: 'img-1' }], total: 1 });
    query.mockResolvedValue([{ face_registered_at: '2026-05-17T10:00:00' }]);

    const result = await provider.registerFace('partner-1', Buffer.from('face'), 'image/jpeg');

    expect(comprefaceClient.createSubject).toHaveBeenCalledWith('partner-1');
    expect(comprefaceClient.addExample).toHaveBeenCalledWith('partner-1', expect.any(Buffer), 'image/jpeg');
    expect(comprefaceClient.listFaces).toHaveBeenCalledWith('partner-1');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE dbo.partners'), [
      'partner-1',
      'partner-1',
    ]);
    expect(result.sampleId).toBe('img-1');
    expect(result.sampleCount).toBe(1);
  });

  it('ignores existing subject errors before adding a face example', async () => {
    const exists = new Error('Subject already exists');
    exists.status = 409;
    comprefaceClient.createSubject.mockRejectedValue(exists);
    comprefaceClient.addExample.mockResolvedValue({ image_id: 'img-1' });
    comprefaceClient.listFaces.mockResolvedValue({ faces: [{ image_id: 'img-1' }], total: 1 });
    query.mockResolvedValue([{ face_registered_at: '2026-05-17T10:00:00' }]);

    const result = await provider.registerFace('partner-1', Buffer.from('face'), 'image/jpeg');

    expect(result.sampleId).toBe('img-1');
    expect(comprefaceClient.addExample).toHaveBeenCalled();
  });

  it('maps Compreface register no-face responses to NO_FACE instead of generic register error', async () => {
    const err = new Error('No face detected');
    err.status = 400;
    comprefaceClient.createSubject.mockResolvedValue({ subject: 'partner-1' });
    comprefaceClient.addExample.mockRejectedValue(err);

    await expect(provider.registerFace('partner-1', Buffer.from('face'), 'image/jpeg')).rejects.toMatchObject({
      code: 'NO_FACE',
      status: 422,
      message: 'No face detected',
    });
  });

  it('does not mark a partner registered when CompreFace stores zero examples', async () => {
    comprefaceClient.createSubject.mockResolvedValue({ subject: 'partner-1' });
    comprefaceClient.addExample.mockResolvedValue({ image_id: 'img-1' });
    comprefaceClient.listFaces.mockResolvedValue({ faces: [], total: 0 });

    await expect(provider.registerFace('partner-1', Buffer.from('face'), 'image/jpeg')).rejects.toMatchObject({
      code: 'COMPREFACE_REGISTER_VERIFY_FAILED',
      status: 502,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('reports unregistered when DB has a subject but CompreFace has no face examples', async () => {
    query.mockResolvedValue([{ face_subject_id: 'partner-1', face_registered_at: '2026-05-17T10:00:00' }]);
    comprefaceClient.listFaces.mockResolvedValue({ faces: [], total: 0 });

    const result = await provider.getFaceStatus('partner-1');

    expect(result).toEqual({
      partnerId: 'partner-1',
      registered: false,
      sampleCount: 0,
      lastRegisteredAt: null,
      provider: 'compreface',
      readiness: {
        score: 0,
        label: 'not_registered',
        targetSampleCount: 3,
        sampleCoverage: 0,
        storedQuality: null,
        recommendedAction: 'register',
        scoringVersion: 'face-readiness-0.32.55',
      },
    });
  });

  it('reports CompreFace sample count from the provider instead of assuming one sample', async () => {
    query.mockResolvedValue([{ face_subject_id: 'partner-1', face_registered_at: '2026-05-17T10:00:00' }]);
    comprefaceClient.listFaces.mockResolvedValue({ faces: [{}, {}, {}], total: 3 });

    const result = await provider.getFaceStatus('partner-1');

    expect(result.registered).toBe(true);
    expect(result.sampleCount).toBe(3);
    expect(result.lastRegisteredAt).toBe('2026-05-17T10:00:00');
    expect(result.readiness).toMatchObject({
      score: 100,
      label: 'excellent',
      recommendedAction: 'ready',
    });
  });
});
