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
});
