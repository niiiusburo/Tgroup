'use strict';

/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[NK3 backend service function: api/src/services/exports/builders/legacyFlatReportColumns]
 * @crossref:uses[product-map/domains/reports-analytics.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const REVENUE_COLUMNS = [
  { key: 'companyName', header: 'Cơ sở' },
  { key: 'customerCode', header: 'Mã Khách hàng', width: 16 },
  { key: 'customerName', header: 'Tên khách hàng', width: 14.09765625 },
  { key: 'customerPhone', header: 'Số điện thoại', width: 20.296875 },
  { key: 'saleOrderCode', header: 'Mã phiếu khám', width: 16 },
  { key: 'serviceName', header: 'Dịch vụ', width: 32 },
  { key: 'saleOrderName', header: 'Tên dịch vụ', width: 32 },
  { key: 'saleOrderTotal', header: 'Tổng tiền phiếu', width: 14, style: 'vnd' },
  { key: 'saleOrderResidual', header: 'Còn lại phiếu', width: 14, style: 'vnd' },
  { key: 'paymentDate', header: 'Ngày thanh toán', width: 18.19921875, style: 'date' },
  { key: 'amount', header: 'Số tiền', width: 11.09765625, style: 'vnd' },
  { key: 'cashAmount', header: 'Tiền mặt', width: 11.8984375, style: 'vnd' },
  { key: 'bankAmount', header: 'Chuyển khoản', width: 18.69921875, style: 'vnd' },
  { key: 'depositUsed', header: 'Tiền cọc', width: 12.19921875, style: 'vnd' },
  { key: 'receiptNumber', header: 'Số biên lai', width: 16 },
  { key: 'paymentNote', header: 'Note thanh toán', width: 28 },
  { key: 'saleOnline', header: 'Sale online', width: 14.296875 },
  { key: 'customerCare', header: 'CSKH' },
  { key: 'doctorName', header: 'Bác sĩ', width: 10.8984375 },
  { key: 'assistantName', header: 'Phụ tá' },
  { key: 'dentalAideName', header: 'Trợ lý bác sĩ', width: 12.5 },
  { key: 'customerSource', header: 'Nguồn khách', width: 14 },
];

const DEPOSIT_COLUMNS = [
  { key: 'companyName', header: 'Cơ sở' },
  { key: 'customerCode', header: 'Mã Khách hàng', width: 16 },
  { key: 'customerName', header: 'Tên khách hàng', width: 14.09765625 },
  { key: 'customerPhone', header: 'Số điện thoại', width: 20.296875 },
  { key: 'depositDate', header: 'Ngày cọc', width: 12.796875, style: 'date' },
  { key: 'amount', header: 'Số tiền cọc', width: 11.5, style: 'vnd' },
  { key: 'cashAmount', header: 'Tiền mặt', width: 11.8984375, style: 'vnd' },
  { key: 'bankAmount', header: 'Chuyển khoản', width: 18.69921875, style: 'vnd' },
  { key: 'paymentMethod', header: 'Phương thức', width: 16 },
  { key: 'depositNote', header: 'Note cọc tiền', width: 28 },
  { key: 'saleOnline', header: 'Sale online', width: 14.296875 },
  { key: 'customerCare', header: 'CSKH' },
  { key: 'customerSource', header: 'Nguồn khách', width: 14 },
];

module.exports = {
  REVENUE_COLUMNS,
  DEPOSIT_COLUMNS,
};
