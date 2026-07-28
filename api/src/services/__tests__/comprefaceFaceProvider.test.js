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

const ALLOWED_CUSTOMER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HIDDEN_CUSTOMER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

  it('hydrates and ranks only allowlisted customers when scoped', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: HIDDEN_CUSTOMER_ID, similarity: 0.99 },
      { subject: ALLOWED_CUSTOMER_ID, similarity: 0.93 },
    ]);
    query.mockResolvedValue([
      {
        id: ALLOWED_CUSTOMER_ID,
        name: 'Alice',
        phone: '0901',
        code: 'T001',
        face_subject_id: ALLOWED_CUSTOMER_ID,
      },
    ]);

    const result = await provider.recognizeFace(
      Buffer.from('face'),
      'image/jpeg',
      [ALLOWED_CUSTOMER_ID]
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('p.id = ANY($2::uuid[])'),
      [[HIDDEN_CUSTOMER_ID, ALLOWED_CUSTOMER_ID], [ALLOWED_CUSTOMER_ID]]
    );
    expect(result.match.partnerId).toBe(ALLOWED_CUSTOMER_ID);
    expect(result.candidates).toEqual([]);
  });

  it('fails closed without hydrating subjects for an empty allowlist', async () => {
    comprefaceClient.recognize.mockResolvedValue([
      { subject: HIDDEN_CUSTOMER_ID, similarity: 0.99 },
    ]);

    const result = await provider.recognizeFace(Buffer.from('face'), 'image/jpeg', []);

    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({ match: null, candidates: [] });
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
