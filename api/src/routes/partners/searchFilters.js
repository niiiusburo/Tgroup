const { accentInsensitiveSearchCondition, normalizeVietnamese } = require('../../utils/search');

function extractRelatedRecordCode(search) {
  const match = search.toUpperCase().match(/\b(?:AP|SO)[A-Z0-9-]*\d[A-Z0-9-]*\b/);
  return match ? match[0] : '';
}

function applyPartnerSearchFilter({ search, conditions, params, paramIdx }) {
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (!trimmedSearch) return paramIdx;

  const digitSearch = trimmedSearch.replace(/\D/g, '');
  const hasLetters = /\p{L}/u.test(trimmedSearch);
  const relatedRecordCode = extractRelatedRecordCode(trimmedSearch);
  const normalizedParamIdx = paramIdx + 1;
  const relatedParamIdx = paramIdx + 2;
  const textMatches = [accentInsensitiveSearchCondition(
    ['p.name', 'p.namenosign', 'p.phone', 'p.ref', 'p.email'],
    paramIdx,
    normalizedParamIdx
  )];

  if (relatedRecordCode) {
    if (relatedRecordCode.startsWith('AP')) {
      textMatches.push(`p.id IN (
      SELECT a.partnerid
      FROM appointments a
      WHERE a.partnerid IS NOT NULL AND a.name LIKE $${relatedParamIdx}
    )`);
    }

    if (relatedRecordCode.startsWith('SO')) {
      textMatches.push(`p.id IN (
      SELECT so.partnerid
      FROM saleorders so
      WHERE so.partnerid IS NOT NULL
        AND so.isdeleted = false
        AND (so.code LIKE $${relatedParamIdx} OR so.name LIKE $${relatedParamIdx})
    )`);
    }
  }

  if (digitSearch && !hasLetters) {
    conditions.push(
      `(${textMatches.join(' OR ')} OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE $${relatedParamIdx})`
    );
    params.push(`%${trimmedSearch}%`, `%${normalizeVietnamese(trimmedSearch)}%`, `%${digitSearch}%`);
    return paramIdx + 3;
  }

  conditions.push(`(${textMatches.join(' OR ')})`);
  params.push(`%${trimmedSearch}%`, `%${normalizeVietnamese(trimmedSearch)}%`);
  if (relatedRecordCode) params.push(`${relatedRecordCode}%`);
  return relatedRecordCode ? paramIdx + 3 : paramIdx + 2;
}

module.exports = {
  extractRelatedRecordCode,
  applyPartnerSearchFilter,
};
