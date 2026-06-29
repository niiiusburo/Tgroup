'use strict';

jest.mock('../comprefaceClient', () => ({
  recognize: jest.fn(),
  createSubject: jest.fn(),
  addExample: jest.fn(),
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
  });

  it('blocks ambiguous Compreface identities instead of returning selectable candidates', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: 'partner-1', similarity: 0.9 },
      { subject: 'partner-2', similarity: 0.86 },
    ]);
    query.mockResolvedValue([
      { id: 'partner-1', name: 'Alice', phone: '0901', code: 'T001', face_subject_id: 'partner-1' },
      { id: 'partner-2', name: 'Bob', phone: '0902', code: 'T002', face_subject_id: 'partner-2' },
    ]);

    const result = await provider.recognizeFace(Buffer.from('face'), 'image/jpeg');

    expect(result.status).toBe('ambiguous');
    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.ambiguity.candidates.map((c) => c.partnerId)).toEqual(['partner-1', 'partner-2']);
    expect(result.recognitionVersion).toMatch(/^face-recognition-/);
  });

  it('maps Compreface multiple-face responses to MULTIPLE_FACES', async () => {
    const err = new Error('More than one face detected');
    err.code = 'MULTIPLE_FACES';
    err.status = 422;
    comprefaceClient.recognize.mockRejectedValue(err);

    await expect(provider.recognizeFace(Buffer.from('face'), 'image/jpeg')).rejects.toMatchObject({
      code: 'MULTIPLE_FACES',
      status: 422,
      message: 'More than one face detected',
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
    query.mockResolvedValue([{ face_registered_at: '2026-05-17T10:00:00' }]);

    const result = await provider.registerFace('partner-1', Buffer.from('face'), 'image/jpeg');

    expect(comprefaceClient.createSubject).toHaveBeenCalledWith('partner-1');
    expect(comprefaceClient.addExample).toHaveBeenCalledWith('partner-1', expect.any(Buffer), 'image/jpeg');
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
});
