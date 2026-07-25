'use strict';

const {
  CLINIC_TZ,
  normalizeSourceId,
  sourceIdsEqual,
  getOpenPeriodStart,
  toDateOnly,
  evaluateSourceLock,
  loadSaleOrderSourceLockState,
} = require('./saleOrderSourceLock');

const AUTHORIZED_CHANGE_CHANNELS = new Set([
  'source_correction',
  'repair_manifest',
  'import_manifest',
]);

function isAuthorizedChangeChannel(channel) {
  return AUTHORIZED_CHANGE_CHANNELS.has(String(channel || '').trim());
}

function classifyUnexpectedChange({ entityType, changeChannel, lockState }) {
  if (entityType !== 'saleorder') {
    return { isUnexpected: false, reasons: [] };
  }
  if (!lockState?.locked) {
    return { isUnexpected: false, reasons: [] };
  }
  if (isAuthorizedChangeChannel(changeChannel)) {
    return { isUnexpected: false, reasons: [] };
  }
  return {
    isUnexpected: true,
    reasons: [...(lockState.reasons || [])],
  };
}

const loadSaleOrderLockContext = loadSaleOrderSourceLockState;

module.exports = {
  CLINIC_TZ,
  AUTHORIZED_CHANGE_CHANNELS,
  normalizeSourceId,
  sourceIdsEqual,
  getOpenPeriodStart,
  toDateOnly,
  evaluateSourceLock,
  isAuthorizedChangeChannel,
  classifyUnexpectedChange,
  loadSaleOrderLockContext,
};
