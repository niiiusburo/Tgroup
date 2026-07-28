function toSafePartnerMutationResponse(row) {
  if (!row) return row;

  const safeRow = { ...row };
  delete safeRow.password_hash;
  delete safeRow.password;
  return safeRow;
}

module.exports = {
  toSafePartnerMutationResponse,
};
