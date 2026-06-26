'use strict';
const { parseSafeClient } = require('../services/clientProjection');

describe('investor client redaction', () => {
  it('allows only safe projection keys', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Nguyen Van A',
      gender: 'male',
      birth_year: 1990,
      appointment_count: 2,
      order_count: 1,
      deposit_balance: 500000,
      outstanding_balance: 1200000,
      status: 'active',
      phone: '0900000000',
      email: 'secret@example.com',
      identitynumber: '001234567890',
      medicalhistory: 'sensitive',
      face_subject_id: 'face-123',
    };

    const safe = parseSafeClient(row);
    expect(safe).toEqual({
      id: row.id,
      name: row.name,
      gender: row.gender,
      birth_year: row.birth_year,
      appointment_count: 2,
      order_count: 1,
      deposit_balance: 500000,
      outstanding_balance: 1200000,
      status: 'active',
    });
    expect(safe).not.toHaveProperty('phone');
    expect(safe).not.toHaveProperty('email');
    expect(safe).not.toHaveProperty('identitynumber');
    expect(safe).not.toHaveProperty('medicalhistory');
    expect(safe).not.toHaveProperty('face_subject_id');
  });
});