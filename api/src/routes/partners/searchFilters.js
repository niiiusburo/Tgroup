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
  const textMatches = [
    `p.name ILIKE $${paramIdx}`,
    `p.namenosign ILIKE $${paramIdx}`,
    `p.phone ILIKE $${paramIdx}`,
    `p.ref ILIKE $${paramIdx}`,
    `p.email ILIKE $${paramIdx}`,
  ];

  if (relatedRecordCode) {
    const relatedParamIdx = paramIdx + 1;
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
      `(${textMatches.join(' OR ')} OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE $${paramIdx + 1})`
    );
    params.push(`%${trimmedSearch}%`, `%${digitSearch}%`);
    return paramIdx + 2;
  }

  conditions.push(`(${textMatches.join(' OR ')})`);
  params.push(`%${trimmedSearch}%`);
  if (relatedRecordCode) params.push(`${relatedRecordCode}%`);
  return relatedRecordCode ? paramIdx + 2 : paramIdx + 1;
}

module.exports = {
  extractRelatedRecordCode,
  applyPartnerSearchFilter,
};
