const {
  booleanOrNull,
  integerOrNull,
  normalizeUuid,
  nullable,
  numberOrZero,
  parseCsvTimestamp,
} = require('./utils');

function mapCompanyRow(row) {
  return {
    id: normalizeUuid(row.Id), name: nullable(row.Name), partnerid: nullable(row.PartnerId),
    email: nullable(row.Email), phone: nullable(row.Phone), active: booleanOrNull(row.Active) ?? true,
    datecreated: parseCsvTimestamp(row.DateCreated), lastupdated: parseCsvTimestamp(row.LastUpdated),
    logo: nullable(row.Logo), ishead: booleanOrNull(row.IsHead) ?? false, parentid: nullable(row.ParentId),
    parentpath: nullable(row.ParentPath),
    notallowexportinventorynegative: booleanOrNull(row.NotAllowExportInventoryNegative) ?? false,
    isuppercasepartnername: booleanOrNull(row.IsUppercasePartnerName) ?? false,
    paymentsmsvalidation: booleanOrNull(row.PaymentSmsValidation) ?? false,
    isconnectconfigmedicalprescription: booleanOrNull(row.IsConnectConfigMedicalPrescription) ?? false,
  };
}

function mapProductCategoryRow(row) {
  return {
    id: normalizeUuid(row.Id), name: nullable(row.Name), completename: nullable(row.CompleteName),
    parentid: nullable(row.ParentId), active: true,
    datecreated: parseCsvTimestamp(row.DateCreated), lastupdated: parseCsvTimestamp(row.LastUpdated),
  };
}

function mapProductRow(row) {
  return {
    id: normalizeUuid(row.Id), name: nullable(row.Name), namenosign: nullable(row.NameNoSign),
    defaultcode: nullable(row.DefaultCode), type: nullable(row.Type), type2: nullable(row.Type2),
    listprice: numberOrZero(row.ListPrice), saleprice: nullable(row.SalePrice) === null ? null : numberOrZero(row.SalePrice),
    purchaseprice: nullable(row.PurchasePrice) === null ? null : numberOrZero(row.PurchasePrice),
    laboprice: nullable(row.LaboPrice) === null ? null : numberOrZero(row.LaboPrice),
    categid: nullable(row.CategId), uomid: nullable(row.UOMId), uomname: nullable(row.UomName),
    companyid: nullable(row.CompanyId), active: booleanOrNull(row.Active) ?? true,
    canorderlab: booleanOrNull(row.IsLabo) || false,
    datecreated: parseCsvTimestamp(row.DateCreated), lastupdated: parseCsvTimestamp(row.LastUpdated),
  };
}

function mapPartnerRow(row) {
  return {
    id: normalizeUuid(row.Id), displayname: nullable(row.DisplayName), name: nullable(row.Name),
    namenosign: nullable(row.NameNoSign), street: nullable(row.Street), phone: nullable(row.Phone),
    email: nullable(row.Email), supplier: booleanOrNull(row.Supplier) ?? false, customer: booleanOrNull(row.Customer) ?? true,
    isagent: booleanOrNull(row.IsAgent) ?? false, isinsurance: booleanOrNull(row.IsInsurance) ?? false,
    companyid: nullable(row.CompanyId), ref: nullable(row.Ref), comment: nullable(row.Comment),
    active: booleanOrNull(row.Active) ?? true, employee: booleanOrNull(row.Employee) ?? false, gender: nullable(row.Gender),
    jobtitle: nullable(row.JobTitle), birthyear: integerOrNull(row.BirthYear),
    birthmonth: integerOrNull(row.BirthMonth), birthday: integerOrNull(row.BirthDay),
    medicalhistory: nullable(row.MedicalHistory), sourceid: nullable(row.SourceId),
    referraluserid: nullable(row.ReferralUserId), note: nullable(row.Note), date: parseCsvTimestamp(row.Date),
    createdbyid: nullable(row.CreatedById), writebyid: nullable(row.WriteById),
    datecreated: parseCsvTimestamp(row.DateCreated), lastupdated: parseCsvTimestamp(row.LastUpdated),
    iscompany: booleanOrNull(row.IsCompany) ?? false, ishead: booleanOrNull(row.IsHead) ?? false,
    treatmentstatus: nullable(row.TreatmentStatus), customerstatus: nullable(row.CustomerStatus),
    marketingstaffid: nullable(row.MarketingStaffId), marketingteamid: nullable(row.MarketingTeamId),
    saleteamid: nullable(row.SaleTeamId), isbusinessinvoice: booleanOrNull(row.IsBusinessInvoice) ?? false,
    isdeleted: booleanOrNull(row.IsDeleted) || false,
  };
}

function mapEmployeeRow(row) {
  return {
    id: normalizeUuid(row.Id), displayname: nullable(row.Name), name: nullable(row.Name),
    street: nullable(row.Address), phone: nullable(row.Phone), email: nullable(row.Email),
    customer: false, supplier: false, employee: true, isagent: false, isinsurance: false,
    active: booleanOrNull(row.Active) ?? true, ref: nullable(row.Ref), companyid: nullable(row.CompanyId),
    isdoctor: booleanOrNull(row.IsDoctor) ?? false, isassistant: booleanOrNull(row.IsAssistant) ?? false,
    isreceptionist: booleanOrNull(row.IsReceptionist) ?? false, datecreated: parseCsvTimestamp(row.DateCreated),
    lastupdated: parseCsvTimestamp(row.LastUpdated), startworkdate: parseCsvTimestamp(row.StartWorkDate),
    wage: numberOrZero(row.Wage), allowance: numberOrZero(row.Allowance), hrjobid: nullable(row.HrJobId),
    isdeleted: false, isbusinessinvoice: false, iscompany: false, ishead: false,
  };
}

module.exports = { mapCompanyRow, mapEmployeeRow, mapPartnerRow, mapProductCategoryRow, mapProductRow };
