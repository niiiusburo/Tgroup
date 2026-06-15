'use strict';

const fs = require('fs');
const path = require('path');

describe('appointment mutationHandlers ctv_id authority', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../mutationHandlers.js'),
    'utf8'
  );

  it('createAppointment fetch SELECT exposes a.ctv_id not profile referred_by', () => {
    const createBlock = source.slice(
      source.indexOf('async function createAppointment'),
      source.indexOf('async function updateAppointment')
    );
    expect(createBlock).toMatch(/a\.ctv_id\s+AS\s+ctv_id/i);
    expect(createBlock).not.toMatch(/p\.referred_by_ctv_id\s+AS\s+ctv_id/i);
  });

  it('updateAppointment fetch SELECT exposes a.ctv_id not profile referred_by', () => {
    const updateBlock = source.slice(source.indexOf('async function updateAppointment'));
    expect(updateBlock).toMatch(/a\.ctv_id\s+AS\s+ctv_id/i);
    expect(updateBlock).not.toMatch(/p\.referred_by_ctv_id\s+AS\s+ctv_id/i);
  });
});