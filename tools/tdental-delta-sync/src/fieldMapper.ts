// FieldMapper — pure: per-table API row -> Postgres row.
import type { MappedRows, MappingError, PgRow } from './types.js';

// ---------- helpers ----------
function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (m) {
      const iso = `${m[3]}-${m[2]}-${m[1]}T${m[4] ?? '00'}:${m[5] ?? '00'}:${m[6] ?? '00'}`;
      const d2 = new Date(iso);
      if (!Number.isNaN(d2.getTime())) return d2;
    }
    return null;
  }
  if (v instanceof Date) return v;
  return null;
}

function toBool(v: unknown, dflt: boolean | null = null): boolean | null {
  if (v === null || v === undefined) return dflt;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return dflt;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  return String(v);
}

function toUuid(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s === '00000000-0000-0000-0000-000000000000') return null;
  if (!/^[0-9a-fA-F-]{32,36}$/.test(s)) return null;
  return s.toLowerCase();
}

function pickNested<T = unknown>(obj: any, path: string[]): T | null {
  let cur: any = obj;
  for (const k of path) {
    if (cur == null) return null;
    cur = cur[k];
  }
  return (cur ?? null) as T | null;
}

// ---------- transforms ----------
type Transform = (row: any) => PgRow | null;

const TRANSFORMS: Record<string, Transform> = {
  companies: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    logo: toText(r.logo),
    active: toBool(r.active, true),
    ishead: toBool(r.isHead, false),
    periodlockdate: toDate(r.periodLockDate),
    medicalfacilitycode: toText(r.medicalFacilityCode),
    phone: toText(r.phone),
    taxcode: toText(r.taxCode),
    taxunitname: toText(r.taxUnitName),
    taxunitaddress: toText(r.taxUnitAddress),
    taxbankname: toText(r.taxBankName),
    taxbankaccount: toText(r.taxBankAccount),
    taxphone: toText(r.taxPhone),
  }),

  aspnetusers: (r) => ({
    id: toText(r.id),
    name: toText(r.name),
    username: toText(r.userName),
    normalizedusername: toText(r.userName)?.toUpperCase() ?? null,
    partnerid: toUuid(r.partnerId),
    active: toBool(r.active, true),
    phonenumber: toText(r.phoneNumber),
  }),

  employees: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    active: toBool(r.active, true),
    ref: toText(r.ref),
    phone: toText(r.phone),
    email: toText(r.email),
    categoryid: toUuid(r.categoryId),
    companyid: toUuid(r.companyId ?? pickNested(r, ['company', 'id']) ?? pickNested(r, ['userCompany', 'id'])),
    partnerid: toUuid(r.partnerId ?? pickNested(r, ['partner', 'id']) ?? null),
    isdoctor: toBool(r.isDoctor, false),
    isassistant: toBool(r.isAssistant, false),
    userid: toText(r.userId ?? pickNested(r, ['partner', 'userId']) ?? null),
    wage: toNum(r.wage),
    leavepermonth: toNum(r.leavePerMonth),
    regularhour: toNum(r.regularHour),
    overtimerate: toNum(r.overtimeRate),
    restdayrate: toNum(r.restDayRate),
    allowance: toNum(r.allowance),
    avatar: toText(r.avatar),
    hrjobid: toUuid(r.hrJobId),
    structuretypeid: toUuid(r.structureTypeId),
    medicalprescriptioncode: toText(r.medicalPrescriptionCode),
    isreceptionist: toBool(r.isReceptionist, false),
  }),

  productcategories: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    completename: toText(r.completeName),
    parentid: toUuid(r.parentId),
    type: toText(r.type),
  }),

  products: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    namenosign: toText(r.nameNoSign),
    categid: toUuid(r.categId),
    listprice: toNum(r.listPrice),
    saleok: toBool(r.saleOK, true),
    ketoaok: toBool(r.keToaOK, false),
    active: toBool(r.active, true),
    uompoid: toUuid(r.uompoId),
    uomid: toUuid(r.uomId),
    type: toText(r.type),
    purchaseok: toBool(r.purchaseOK, false),
    description: toText(r.description),
    companyid: toUuid(r.companyId),
    defaultcode: toText(r.defaultCode),
    nameget: toText(r.nameGet),
    islabo: toBool(r.isLabo, false),
    type2: toText(r.type2),
    purchaseprice: toNum(r.purchasePrice),
    laboprice: toNum(r.laboPrice),
    mininventory: toNum(r.minInventory),
    origin: toText(r.origin),
    expiry: toNum(r.expiry),
    uomname: toText(r.uomName),
    taxid: toUuid(r.taxId),
  }),

  partners: (r) => {
    const id = toUuid(r.id);
    if (!id) return null;
    return {
      id,
      displayname: toText(r.displayName),
      name: toText(r.name) ?? '',
      namenosign: toText(r.nameNoSign),
      street: toText(r.street),
      phone: toText(r.phone),
      email: toText(r.email),
      supplier: toBool(r.supplier, false) ?? false,
      customer: toBool(r.customer, true) ?? true,
      isagent: toBool(r.isAgent, false) ?? false,
      isinsurance: toBool(r.isInsurance, false) ?? false,
      companyid: toUuid(r.companyId),
      ref: toText(r.ref),
      comment: toText(r.comment),
      active: toBool(r.active, true) ?? true,
      employee: toBool(r.employee, false) ?? false,
      gender: toText(r.gender),
      jobtitle: toText(r.jobTitle),
      birthyear: toInt(r.birthYear),
      birthmonth: toInt(r.birthMonth),
      birthday: toInt(r.birthDay),
      medicalhistory: toText(r.medicalHistory),
      cityname: toText(r.cityName),
      districtname: toText(r.districtName),
      wardname: toText(r.wardName),
      barcode: toText(r.barcode),
      fax: toText(r.fax),
      sourceid: toUuid(r.sourceId),
      referraluserid: toText(r.referralUserId),
      note: toText(r.note),
      avatar: toText(r.avatar),
      zaloid: toText(r.zaloId),
      date: toDate(r.dateCreated ?? r.date),
      titleid: toUuid(r.titleId),
      agentid: toUuid(r.agentId),
      weight: toNum(r.weight),
      healthinsurancecardnumber: toText(r.healthInsuranceCardNumber),
      datecreated: toDate(r.dateCreated),
      iscompany: toBool(r.isCompany, false) ?? false,
      ishead: toBool(r.isHead, false) ?? false,
      countryid: toUuid(r.countryId),
      stateid: toUuid(r.stateId),
      userid: toText(r.userId),
      emergencyphone: toText(r.emergencyPhone),
      taxcode: toText(r.taxCode),
      unitaddress: toText(r.unitAddress),
      unitname: toText(r.unitName),
      customername: toText(r.customerName),
      invoicereceivingmethod: toText(r.invoiceReceivingMethod),
      isbusinessinvoice: toBool(r.isBusinessInvoice, false) ?? false,
      personaladdress: toText(r.personalAddress),
      personalname: toText(r.personalName),
      receiveremail: toText(r.receiverEmail),
      receiverzalonumber: toText(r.receiverZaloNumber),
      personalidentitycard: toText(r.personalIdentityCard),
      personaltaxcode: toText(r.personalTaxCode),
      citycodev2: toText(pickNested(r, ['cityV2', 'code'])),
      citynamev2: toText(pickNested(r, ['cityV2', 'name'])),
      identitynumber: toText(r.identityNumber),
      usedaddressv2: toBool(r.usedAddressV2, null),
      wardcodev2: toText(pickNested(r, ['wardV2', 'code'])),
      wardnamev2: toText(pickNested(r, ['wardV2', 'name'])),
      age: toInt(r.age),
      contactstatusid: toUuid(pickNested(r, ['contactStatus', 'id'])),
      customerstatus: toText(r.customerStatus),
      marketingstaffid: toText(pickNested(r, ['marketingStaff', 'id'])),
      potentiallevel: toText(r.potentialLevel),
      marketingteamid: toUuid(pickNested(r, ['marketingTeam', 'teamId'])),
      saleteamid: toUuid(pickNested(r, ['saleTeam', 'teamId'])),
      isdeleted: false,
    };
  },

  appointments: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    date: toDate(r.date),
    time: toText(r.time),
    datetimeappointment: toDate(r.date),
    timeexpected: toInt(r.timeExpected),
    note: toText(r.note),
    userid: toText(r.userId),
    partnerid: toUuid(r.partnerId),
    companyid: toUuid(r.companyId),
    doctorid: toUuid(r.doctorId),
    state: toText(r.state),
    aptstate: toText(r.aptState),
    reason: toText(r.reason),
    isrepeatcustomer: toBool(r.isRepeatCustomer, false),
    color: toText(r.color),
    leadid: toUuid(r.leadId),
    datecreated: toDate(r.dateCreated),
  }),

  customerreceipts: (r) => ({
    id: toUuid(r.id),
    datewaiting: toDate(r.dateWaiting),
    dateexamination: toDate(r.dateExamination),
    datedone: toDate(r.dateDone),
    timeexpected: toInt(r.timeExpected),
    note: toText(r.note),
    partnerid: toUuid(r.partnerId),
    companyid: toUuid(r.companyId),
    doctorid: toUuid(r.doctorId),
    state: toText(r.state),
    reason: toText(r.reason),
    isrepeatcustomer: toBool(r.isRepeatCustomer, false),
    isnotreatment: toBool(r.isNoTreatment, false),
  }),

  saleorders: (r) => ({
    id: toUuid(r.id),
    dateorder: toDate(r.dateOrder),
    partnerid: toUuid(r.partnerId ?? pickNested(r, ['partner', 'id'])),
    amounttotal: toNum(r.amountTotal),
    amounttax: toNum(r.amountTax),
    amountuntaxed: toNum(r.amountUntaxed),
    invoicestatus: toText(r.invoiceStatus),
    state: toText(r.state),
    name: toText(r.name),
    note: toText(r.note),
    userid: toText(r.userId),
    residual: toNum(r.residual),
    totalpaid: toNum(r.totalPaid),
    companyid: toUuid(r.companyId),
    doctorid: toUuid(r.doctorId),
    paymentstate: toText(r.paymentState),
  }),

  saleorderlines: (r) => ({
    id: toUuid(r.id),
    date: toDate(r.date),
    name: toText(r.name),
    state: toText(r.state),
    orderpartnerid: toUuid(r.orderPartnerId),
    orderid: toUuid(r.orderId),
    productid: toUuid(r.productId),
    employeeid: toUuid(r.employeeId),
    assistantid: toUuid(r.assistantId),
    counselorid: toUuid(r.counselorId),
    productuomqty: toNum(r.productUOMQty),
    productuomid: toUuid(r.productUOMId),
    priceunit: toNum(r.priceUnit),
    pricesubtotal: toNum(r.priceSubTotal),
    pricetotal: toNum(r.priceTotal),
    toothtype: toText(r.toothType),
    toothrange: toText(r.toothRange),
    discounttype: toText(r.discountType),
    discount: toNum(r.discount),
    discountfixedamount: toNum(r.discountFixedAmount),
    toothtypefilter: toInt(r.toothTypeFilter),
    amountinvoiced: toNum(r.amountInvoiced),
    amounteinvoiced: toNum(r.amountEInvoiced),
    diagnostic: toText(r.diagnostic),
    amountresidual: toNum(r.amountResidual),
    isactive: toBool(r.isActive, true),
    isglobaldiscount: toBool(r.isGlobalDiscount, false),
    isrewardline: toBool(r.isRewardLine, false),
    taxid: toUuid(r.taxId),
    amountdiscounttotal: toNum(r.amountDiscountTotal),
    lastserviceuserdate: toDate(r.lastServiceUseDate),
  }),

  dotkhams: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    saleorderid: toUuid(r.saleOrderId),
    partnerid: toUuid(r.partnerId),
    date: toDate(r.date),
    reason: toText(r.reason),
    state: toText(r.state),
    doctorid: toUuid(r.doctorId),
    assistantid: toUuid(r.assistantId),
    assistantsecondaryid: toUuid(r.assistantSecondaryId),
    note: toText(r.note),
    userid: toText(r.doctorUserId),
    invoicestate: toText(r.invoiceState),
    paymentstate: toText(r.paymentState),
    totalamount: toNum(r.totalAmount),
    amountresidual: toNum(r.totalInvoicesResidual),
  }),

  accountpayments: (r) => ({
    id: toUuid(r.id),
    companyid: toUuid(r.companyId),
    partnerid: toUuid(r.partnerId),
    partnertype: toText(r.partnerType),
    paymentdate: toDate(r.paymentDate),
    journalid: toUuid(pickNested(r, ['journal', 'id']) ?? r.journalId),
    destinationaccountid: toUuid(r.destinationAccountId),
    destinationjournalid: toUuid(r.destinationJournalId),
    state: toText(r.state),
    name: toText(r.name),
    paymenttype: toText(r.paymentType),
    amount: toNum(r.amount),
    communication: toText(r.communication),
  }),

  partneradvances: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    date: toDate(r.date),
    amount: toNum(r.amount),
    partnerid: toUuid(r.partnerId),
    journalid: toUuid(r.journalId),
    companyid: toUuid(r.companyId),
    type: toText(r.type),
    state: toText(r.state),
    note: toText(r.note),
  }),

  dotkhamsteps: (r) => ({
    id: toUuid(r.id),
    name: toText(r.name),
    productid: toUuid(r.productId ?? null),
    salelineid: toUuid(r.saleLineId),
    saleorderid: toUuid(r.saleOrderId ?? null),
    isdone: toBool(r.isDone, false),
    order: toInt(r.order),
    numberoftimes: toInt(r.numberOfTimes),
    datecreated: toDate(r.dateCreated),
  }),
};

export function mapRows(tableName: string, apiRows: unknown[]): MappedRows {
  const t = TRANSFORMS[tableName];
  if (!t) {
    return {
      pgRows: [],
      errors: [
        { table: tableName, reason: `No transform registered for table '${tableName}'`, row: null },
      ],
    };
  }

  const pgRows: PgRow[] = [];
  const errors: MappingError[] = [];

  for (const raw of apiRows) {
    try {
      const mapped = t(raw as any);
      if (!mapped) {
        errors.push({ table: tableName, reason: 'transform returned null', row: raw });
        continue;
      }
      if (mapped.id === null || mapped.id === undefined || mapped.id === '') {
        errors.push({ table: tableName, reason: 'mapped row has null id', row: raw });
        continue;
      }
      pgRows.push(mapped);
    } catch (e) {
      errors.push({
        table: tableName,
        reason: `transform threw: ${(e as Error).message}`,
        row: raw,
      });
    }
  }

  return { pgRows, errors };
}

export const __test = { toDate, toBool, toInt, toNum, toText, toUuid, pickNested };
