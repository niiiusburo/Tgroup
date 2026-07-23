const { query } = require('../../db');

const CUSTOMER_SOURCE_NOT_SELECTABLE = 'CUSTOMER_SOURCE_NOT_SELECTABLE';

async function getCustomerSourceSelectionError(sourceId, saleOrderId = null, queryFn = query) {
  if (sourceId === undefined || sourceId === null || sourceId === '') {
    return null;
  }

  const rows = await queryFn(
    `SELECT
       cs.is_active,
       EXISTS (
         SELECT 1
         FROM dbo.saleorders so
         WHERE so.id = $2
           AND so.sourceid = cs.id
           AND COALESCE(so.isdeleted, false) = false
       ) AS already_selected
     FROM dbo.customersources cs
     WHERE cs.id = $1
     FOR SHARE OF cs`,
    [sourceId, saleOrderId],
  );

  const source = rows[0];
  if (source && (source.is_active === true || source.already_selected === true)) {
    return null;
  }

  return {
    error: 'Customer source is inactive or does not exist',
    code: CUSTOMER_SOURCE_NOT_SELECTABLE,
  };
}

module.exports = {
  CUSTOMER_SOURCE_NOT_SELECTABLE,
  getCustomerSourceSelectionError,
};
