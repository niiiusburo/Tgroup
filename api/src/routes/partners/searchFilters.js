function applyPartnerSearchFilter({ search, conditions, params, paramIdx }) {
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (!trimmedSearch) return paramIdx;

  const digitSearch = trimmedSearch.replace(/\D/g, '');
  const hasLetters = /\p{L}/u.test(trimmedSearch);
  const textMatches = [
    `p.name ILIKE $${paramIdx}`,
    `p.namenosign ILIKE $${paramIdx}`,
    `p.phone ILIKE $${paramIdx}`,
    `p.ref ILIKE $${paramIdx}`,
    `p.email ILIKE $${paramIdx}`,
  ];

  if (digitSearch && !hasLetters) {
    conditions.push(
      `(${textMatches.join(' OR ')} OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE $${paramIdx + 1})`
    );
    params.push(`%${trimmedSearch}%`, `%${digitSearch}%`);
    return paramIdx + 2;
  }

  conditions.push(`(${textMatches.join(' OR ')})`);
  params.push(`%${trimmedSearch}%`);
  return paramIdx + 1;
}

module.exports = {
  applyPartnerSearchFilter,
};
