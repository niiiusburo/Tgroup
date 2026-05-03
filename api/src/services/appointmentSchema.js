'use strict';

const { query } = require('../db');

let columnsPromise = null;

async function getAppointmentColumns() {
  if (!columnsPromise) {
    columnsPromise = query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'dbo' AND table_name = 'appointments'`
    ).then(rows => new Set(rows.map(row => row.column_name)));
  }
  return columnsPromise;
}

async function getAppointmentSchemaCapabilities() {
  const columns = await getAppointmentColumns();
  const hasAssistantId = columns.has('assistantid');
  const hasDentalAideId = columns.has('dentalaideid');

  return {
    hasAssistantId,
    hasDentalAideId,
    assistantSelectSql: hasAssistantId ? 'a.assistantid AS assistantid' : 'NULL::uuid AS assistantid',
    assistantNameSelectSql: hasAssistantId ? 'ass.name AS assistantname' : 'NULL::text AS assistantname',
    dentalAideSelectSql: hasDentalAideId ? 'a.dentalaideid AS dentalaideid' : 'NULL::uuid AS dentalaideid',
    dentalAideNameSelectSql: hasDentalAideId ? 'da.name AS dentalaidename' : 'NULL::text AS dentalaidename',
    assistantJoinSql: [
      hasAssistantId ? 'LEFT JOIN employees ass ON ass.id = a.assistantid' : '',
      hasDentalAideId ? 'LEFT JOIN employees da ON da.id = a.dentalaideid' : '',
    ].filter(Boolean).join('\n'),
  };
}

function resetAppointmentSchemaCacheForTests() {
  columnsPromise = null;
}

module.exports = {
  getAppointmentSchemaCapabilities,
  resetAppointmentSchemaCacheForTests,
};
