const { clean, normalizeUuid } = require('./utils');

function normalizeMatchName(value) {
  return clean(value)
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeAliasName(value) {
  return normalizeMatchName(value).replace(/\s+/g, '');
}

function toBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  return ['1', 'true', 't', 'yes'].includes(clean(value).toLowerCase());
}

function employeeScore(employee) {
  return [
    toBoolean(employee.active) ? 1000 : 0,
    (employee.location_ids || []).length * 10,
    clean(employee.phone) ? 4 : 0,
    clean(employee.email) ? 3 : 0,
    clean(employee.ref) ? 2 : 0,
    clean(employee.companyid) ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function chooseCanonicalEmployee(matches) {
  return [...matches].sort((a, b) => employeeScore(b) - employeeScore(a) || clean(a.id).localeCompare(clean(b.id)))[0];
}

function sourceEmployeeCandidate(row, id) {
  return {
    id: normalizeUuid(id || row.Id || row.id),
    name: clean(row.Name || row.DisplayName || row.name),
    phone: clean(row.Phone || row.phone),
    email: clean(row.Email || row.email),
    ref: clean(row.Ref || row.ref),
    companyid: normalizeUuid(row.CompanyId || row.companyid),
    active: row.Active === undefined ? true : row.Active,
    location_ids: [],
  };
}

module.exports = {
  chooseCanonicalEmployee,
  employeeScore,
  normalizeAliasName,
  normalizeMatchName,
  sourceEmployeeCandidate,
};
