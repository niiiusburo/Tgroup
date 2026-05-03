'use strict';

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../db');
const {
  getAppointmentSchemaCapabilities,
  resetAppointmentSchemaCacheForTests,
} = require('../appointmentSchema');

beforeEach(() => {
  query.mockReset();
  resetAppointmentSchemaCacheForTests();
});

describe('appointmentSchema', () => {
  it('falls back to null selects when assistant columns are missing', async () => {
    query.mockResolvedValueOnce([
      { column_name: 'id' },
      { column_name: 'date' },
      { column_name: 'doctorid' },
    ]);

    const result = await getAppointmentSchemaCapabilities();

    expect(result.hasAssistantId).toBe(false);
    expect(result.hasDentalAideId).toBe(false);
    expect(result.assistantSelectSql).toBe('NULL::uuid AS assistantid');
    expect(result.dentalAideSelectSql).toBe('NULL::uuid AS dentalaideid');
    expect(result.assistantJoinSql).toBe('');
  });

  it('uses real assistant joins when columns exist', async () => {
    query.mockResolvedValueOnce([
      { column_name: 'assistantid' },
      { column_name: 'dentalaideid' },
    ]);

    const result = await getAppointmentSchemaCapabilities();

    expect(result.hasAssistantId).toBe(true);
    expect(result.hasDentalAideId).toBe(true);
    expect(result.assistantSelectSql).toBe('a.assistantid AS assistantid');
    expect(result.dentalAideSelectSql).toBe('a.dentalaideid AS dentalaideid');
    expect(result.assistantJoinSql).toContain('LEFT JOIN employees ass');
    expect(result.assistantJoinSql).toContain('LEFT JOIN employees da');
  });
});
