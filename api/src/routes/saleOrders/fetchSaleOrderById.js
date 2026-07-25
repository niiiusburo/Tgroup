const { query } = require('../../db');
const { orderAndCustomerSourceSelectSql } = require('../../lib/orderSourceSemantics');

function fetchSaleOrderById(id, queryFn = query) {
  const sourceFields = orderAndCustomerSourceSelectSql();
  return queryFn(
    `SELECT
      so.id,
      so.name,
      so.code,
      so.partnerid,
      p.name AS partnername,
      p.displayname AS partnerdisplayname,
      so.amounttotal,
      so.residual,
      so.totalpaid,
      so.state,
      so.companyid,
      c.name AS companyname,
      so.doctorid,
      doc.name AS doctorname,
      so.assistantid,
      asst.name AS assistantname,
      so.dentalaideid,
      da.name AS dentalaidename,
      so.quantity,
      so.unit,
      so.datestart,
      so.dateend,
      so.notes,
      ${sourceFields.select},
      (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
      (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
      (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
      (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
      so.datecreated,
      so.isdeleted
    FROM saleorders so
    LEFT JOIN partners p ON p.id = so.partnerid
    LEFT JOIN companies c ON c.id = so.companyid
    LEFT JOIN employees doc ON doc.id = so.doctorid
    LEFT JOIN employees asst ON asst.id = so.assistantid
    LEFT JOIN employees da ON da.id = so.dentalaideid
    ${sourceFields.joins}
    WHERE so.id = $1 AND so.isdeleted = false`,
    [id],
  );
}

module.exports = { fetchSaleOrderById };
