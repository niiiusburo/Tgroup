const VIETNAMESE_ACCENT_CHARS = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
const VIETNAMESE_ASCII_CHARS = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

function normalizeVietnamese(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function normalizedSql(columnExpression) {
  return `TRANSLATE(LOWER(COALESCE(${columnExpression}::text, '')), '${VIETNAMESE_ACCENT_CHARS}', '${VIETNAMESE_ASCII_CHARS}')`;
}

function accentInsensitiveSearchCondition(columns, rawParamIdx, normalizedParamIdx = rawParamIdx + 1) {
  return `(${columns
    .flatMap((column) => [
      `${column} ILIKE $${rawParamIdx}`,
      `${normalizedSql(column)} LIKE $${normalizedParamIdx}`,
    ])
    .join(' OR ')})`;
}

function addAccentInsensitiveSearchCondition({ conditions, params, columns, search, paramIdx }) {
  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (!trimmedSearch) return paramIdx;

  conditions.push(accentInsensitiveSearchCondition(columns, paramIdx));
  params.push(`%${trimmedSearch}%`, `%${normalizeVietnamese(trimmedSearch)}%`);
  return paramIdx + 2;
}

module.exports = {
  normalizeVietnamese,
  normalizedSql,
  accentInsensitiveSearchCondition,
  addAccentInsensitiveSearchCondition,
};
