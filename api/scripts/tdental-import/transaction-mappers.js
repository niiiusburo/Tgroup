const {
  booleanOrNull,
  clean,
  integerOrNull,
  normalizeUuid,
  nullable,
  numberOrZero,
  parseCsvDateOnly,
  parseCsvTimestamp,
  uuidOrNull,
} = require('./utils');
const { mapAppointmentState, mapSaleOrderState } = require('./mapping-rules');

function mapSaleOrderRow(row) {
  return {
    id: normalizeUuid(row.Id), name: nullable(row.Name), partnerid: uuidOrNull(row.PartnerId),
    companyid: uuidOrNull(row.CompanyId), doctorid: uuidOrNull(row.DoctorId),
    amounttotal: numberOrZero(row.AmountTotal), residual: numberOrZero(row.Residual),
    totalpaid: numberOrZero(row.TotalPaid), state: mapSaleOrderState(row.State), isdeleted: booleanOrNull(row.IsDeleted) || false,
    datecreated: parseCsvTimestamp(row.DateCreated), notes: nullable(row.Note), code: nullable(row.Name),
    dateordered: parseCsvTimestamp(row.DateOrder), lastupdated: parseCsvTimestamp(row.LastUpdated),
  };
}

function mapAppointmentRow(row) {
  return {
    id: normalizeUuid(row.Id), name: nullable(row.Name) || 'Appointment',
    date: parseCsvTimestamp(row.Date), time: nullable(row.Time), datetimeappointment: parseCsvTimestamp(row.DateTimeAppointment),
    dateappointmentreminder: parseCsvTimestamp(row.DateAppointmentReminder), timeexpected: integerOrNull(row.TimeExpected) || 30,
    note: nullable(row.Note), userid: nullable(row.UserId), partnerid: uuidOrNull(row.PartnerId),
    companyid: uuidOrNull(row.CompanyId), dotkhamid: uuidOrNull(row.DotKhamId), doctorid: uuidOrNull(row.DoctorId),
    state: mapAppointmentState(row.State), reason: nullable(row.Reason), saleorderid: uuidOrNull(row.SaleOrderId),
    isrepeatcustomer: booleanOrNull(row.IsRepeatCustomer) || false, color: nullable(row.Color),
    createdbyid: nullable(row.CreatedById), writebyid: nullable(row.WriteById),
    datecreated: parseCsvTimestamp(row.DateCreated), lastupdated: parseCsvTimestamp(row.LastUpdated),
    leadid: uuidOrNull(row.LeadId), callid: uuidOrNull(row.CallId), teamid: uuidOrNull(row.TeamId),
    lastdatereminder: parseCsvTimestamp(row.LastDateReminder), confirmedid: uuidOrNull(row.ConfirmedId),
    datetimearrived: parseCsvTimestamp(row.DateTimeArrived), datetimedismissed: parseCsvTimestamp(row.DateTimeDismissed),
    datetimeseated: parseCsvTimestamp(row.DateTimeSeated), aptstate: nullable(row.AptState) || mapAppointmentState(row.State),
    customerreceiptid: uuidOrNull(row.CustomerReceiptId), customercarestatus: integerOrNull(row.CustomerCareStatus),
    datedone: parseCsvTimestamp(row.DateDone), isnotreatment: booleanOrNull(row.IsNoTreatment) || false,
    crmtaskid: uuidOrNull(row.CrmTaskId),
  };
}

function mapSaleOrderLineRow(row) {
  return {
    id: normalizeUuid(row.Id), orderid: uuidOrNull(row.OrderId), productid: uuidOrNull(row.ProductId),
    productname: nullable(row.Name), name: nullable(row.Name), pricetotal: numberOrZero(row.PriceTotal),
    isdeleted: booleanOrNull(row.IsDeleted) || false, datecreated: parseCsvTimestamp(row.DateCreated),
    employeeid: uuidOrNull(row.EmployeeId), assistantid: uuidOrNull(row.AssistantId),
    productuomqty: numberOrZero(row.ProductUOMQty), priceunit: numberOrZero(row.PriceUnit),
    pricesubtotal: numberOrZero(row.PriceSubTotal), discount: numberOrZero(row.Discount),
    amountpaid: numberOrZero(row.AmountPaid), amountresidual: numberOrZero(row.AmountResidual),
    date: parseCsvTimestamp(row.Date), toothrange: nullable(row.ToothRange),
    tooth_numbers: nullable(row.ToothRange), toothtype: nullable(row.ToothType),
    diagnostic: nullable(row.Diagnostic), note: nullable(row.Note), sequence: integerOrNull(row.Sequence),
    state: nullable(row.State), iscancelled: booleanOrNull(row.IsCancelled) || false,
    orderpartnerid: uuidOrNull(row.OrderPartnerId), companyid: uuidOrNull(row.CompanyId),
    counselorid: uuidOrNull(row.CounselorId), isrewardline: booleanOrNull(row.IsRewardLine) || false,
    isglobaldiscount: booleanOrNull(row.IsGlobalDiscount) || false, discounttype: nullable(row.DiscountType),
    discountfixed: numberOrZero(row.DiscountFixed), toothtypefilter: integerOrNull(row.ToothTypeFilter),
    amountinvoiced: numberOrZero(row.AmountInvoiced), isactive: booleanOrNull(row.IsActive),
    lastupdated: parseCsvTimestamp(row.LastUpdated), productuomid: uuidOrNull(row.ProductUOMId),
    pricetax: numberOrZero(row.PriceTax), invoicestatus: nullable(row.InvoiceStatus),
    qtytoinvoice: numberOrZero(row.QtyToInvoice), qtyinvoiced: numberOrZero(row.QtyInvoiced),
    amounttoinvoice: numberOrZero(row.AmountToInvoice), toothcategoryid: nullable(row.ToothCategoryId),
    pricereduce: nullable(row.PriceReduce) === null ? null : numberOrZero(row.PriceReduce),
    amountdiscounttotal: numberOrZero(row.AmountDiscountTotal),
    amountinsurancepaidtotal: numberOrZero(row.AmountInsurancePaidTotal), insuranceid: uuidOrNull(row.InsuranceId),
    advisoryid: uuidOrNull(row.AdvisoryId), agentid: uuidOrNull(row.AgentId), createdbyid: uuidOrNull(row.CreatedById),
    writebyid: uuidOrNull(row.WriteById), amountdiscount: numberOrZero(row.AmountDiscount),
    isdownpayment: booleanOrNull(row.IsDownPayment) || false, treatmentplan: nullable(row.TreatmentPlan),
    lastserviceuserdate: parseCsvTimestamp(row.LastServiceUserDate), qtydelivered: numberOrZero(row.QtyDelivered),
    taxid: uuidOrNull(row.TaxId), discountfixedamount: numberOrZero(row.DiscountFixedAmount),
    amounteinvoiced: numberOrZero(row.AmountEInvoiced),
  };
}

function methodFromCommunication(row) {
  const text = `${row.Communication || ''} ${row.PaymentType || ''}`.toLowerCase();
  if (/(ck|bank|transfer|chuyển|chuyen)/i.test(text)) return 'bank_transfer';
  return 'cash';
}

function mapAccountPaymentToPayment(row) {
  const status = clean(row.State).toLowerCase() === 'posted' ? 'posted' : 'voided';
  return {
    id: normalizeUuid(row.Id), customer_id: normalizeUuid(row.PartnerId), service_id: null,
    amount: numberOrZero(row.Amount), method: methodFromCommunication(row),
    notes: nullable(row.Communication) || nullable(row.Name), created_at: parseCsvTimestamp(row.DateCreated),
    payment_date: parseCsvDateOnly(row.PaymentDate), reference_code: nullable(row.Name),
    status, deposit_used: 0, cash_amount: 0, bank_amount: 0, receipt_number: null,
    deposit_type: status === 'voided' ? 'usage' : null, payment_category: 'payment',
  };
}

function mapAccountPaymentRow(row) {
  return {
    id: normalizeUuid(row.Id), partnerid: normalizeUuid(row.PartnerId),
    amount: numberOrZero(row.Amount), paymenttype: nullable(row.PaymentType), state: nullable(row.State),
  };
}

module.exports = {
  mapAppointmentRow,
  mapAccountPaymentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  mapSaleOrderRow,
};
