const crypto = require('crypto');
const { clean, noSign, textKey } = require('./normalizers');
const { refreshSnapshot } = require('./dbSnapshot');

function makeImportedNote(prefix, row) {
  const parts = [
    prefix,
    row.sheet ? `sheet=${row.sheet}` : '',
    row.rowNumber ? `row=${row.rowNumber}` : '',
    row.note ? `note=${row.note}` : '',
    row.referralText ? `referral=${row.referralText}` : '',
    row.saleOnlineName ? `sale=${row.saleOnlineName}` : '',
  ].filter(Boolean);
  return parts.join(' | ');
}

function firstExisting(map, key) {
  const matches = map.get(key) || [];
  return matches.length === 1 ? matches[0] : null;
}

async function insertPartner(client, row) {
  const columns = [
    'id', 'displayname', 'name', 'namenosign', 'phone', 'customer', 'supplier',
    'isagent', 'isinsurance', 'companyid', 'ref', 'comment', 'note', 'active',
    'employee', 'date', 'datecreated', 'lastupdated', 'iscompany', 'ishead',
    'isbusinessinvoice', 'isdeleted', 'isdoctor', 'isassistant', 'isreceptionist',
    'salestaffid', 'lob_scope', 'is_ctv',
  ];
  const values = columns.map((column) => row[column] === undefined ? null : row[column]);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  await client.query(
    `INSERT INTO partners (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values,
  );
}

async function ensureCompanies(client, plan, maps) {
  let created = 0;
  for (const item of plan.actions.companies) {
    const key = textKey(item.name);
    if (!key || maps.companyByName.has(key)) continue;
    const companyPartnerId = crypto.randomUUID();
    const companyId = crypto.randomUUID();
    const now = new Date();
    await insertPartner(client, {
      id: companyPartnerId,
      displayname: item.name,
      name: item.name,
      namenosign: noSign(item.name),
      customer: false,
      supplier: false,
      isagent: false,
      isinsurance: false,
      active: true,
      employee: false,
      datecreated: now,
      lastupdated: now,
      iscompany: true,
      ishead: false,
      isbusinessinvoice: false,
      isdeleted: false,
      isdoctor: false,
      isassistant: false,
      isreceptionist: false,
      lob_scope: ['cosmetic'],
      is_ctv: false,
    });
    await client.query(
      `INSERT INTO companies (
        id, name, partnerid, active, notallowexportinventorynegative,
        isuppercasepartnername, ishead, paymentsmsvalidation,
        isconnectconfigmedicalprescription, datecreated, lastupdated
      ) VALUES ($1,$2,$3,true,false,false,false,false,false,$4,$4)`,
      [companyId, item.name, companyPartnerId, now],
    );
    maps.companyByName.set(key, { id: companyId, name: item.name });
    created += 1;
  }
  return created;
}

function collectStaffRoles(source) {
  const roles = new Map();
  const add = (name, role) => {
    const key = textKey(name);
    if (!key) return;
    if (!roles.has(key)) roles.set(key, { name: clean(name), isdoctor: false, isassistant: false, isreceptionist: false });
    roles.get(key)[role] = true;
  };
  for (const profile of source.profiles) add(profile.saleOnlineName, 'isreceptionist');
  for (const exam of source.exams) {
    add(exam.doctorName, 'isdoctor');
    add(exam.assistantName, 'isassistant');
  }
  return roles;
}

async function ensureStaff(client, plan, source, maps) {
  const roles = collectStaffRoles(source);
  let created = 0;
  for (const item of plan.actions.staff) {
    const key = textKey(item.name);
    if (!key || maps.staffByName.has(key)) continue;
    const role = roles.get(key) || {};
    const staff = {
      id: crypto.randomUUID(),
      name: item.name,
      displayname: item.name,
      namenosign: noSign(item.name),
      customer: false,
      supplier: false,
      isagent: false,
      isinsurance: false,
      active: true,
      employee: true,
      datecreated: new Date(),
      lastupdated: new Date(),
      iscompany: false,
      ishead: false,
      isbusinessinvoice: false,
      isdeleted: false,
      isdoctor: Boolean(role.isdoctor),
      isassistant: Boolean(role.isassistant),
      isreceptionist: Boolean(role.isreceptionist),
      lob_scope: ['cosmetic'],
      is_ctv: false,
      ref: `COS-STAFF-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 8)}`,
      note: 'Imported from cosmetic source workbook staff/name columns',
    };
    await insertPartner(client, staff);
    maps.staffByName.set(key, staff);
    created += 1;
  }
  return created;
}

async function ensureProducts(client, plan, source, maps) {
  const firstAmountByName = new Map();
  for (const exam of source.exams) {
    const key = textKey(exam.serviceName);
    if (!key || firstAmountByName.has(key)) continue;
    firstAmountByName.set(key, exam.serviceAmount || 0);
  }
  let created = 0;
  for (const item of plan.actions.products) {
    const key = textKey(item.name);
    if (!key || maps.productsByName.has(key)) continue;
    const id = crypto.randomUUID();
    const price = firstAmountByName.get(key) || 0;
    await client.query(
      `INSERT INTO products (
        id, name, namenosign, defaultcode, type, type2, listprice, saleprice,
        purchaseprice, laboprice, uomname, active, canorderlab, datecreated,
        lastupdated, commission_rate_percent
      ) VALUES ($1,$2,$3,$4,'service','service',$5,$5,0,0,'Lần',true,false,NOW(),NOW(),0)`,
      [id, item.name, noSign(item.name), `COS-SVC-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 8)}`, price],
    );
    maps.productsByName.set(key, { id, name: item.name });
    created += 1;
  }
  return created;
}

function buildMapsFromSnapshot(snapshot) {
  return {
    companyByName: new Map(snapshot.companyByName),
    customersByPhone: new Map([...snapshot.customersByPhone].map(([phone, rows]) => [phone, [...rows]])),
    staffByName: new Map(snapshot.staffByName),
    productsByName: new Map(snapshot.productsByName),
    paymentRefs: new Set(snapshot.paymentRefs),
    orderCodes: new Set(snapshot.orderCodes),
  };
}

async function applyCustomers(client, plan, source, maps) {
  const profileByRow = new Map(source.profiles.map((profile) => [profile.rowNumber, profile]));
  let created = 0;
  let updated = 0;
  for (const action of plan.actions.customers) {
    const profile = profileByRow.get(action.rowNumber);
    if (!profile || !profile.phone) continue;
    const existing = firstExisting(maps.customersByPhone, profile.phone);
    const company = maps.companyByName.get(textKey(profile.branchName));
    const sale = maps.staffByName.get(textKey(profile.saleOnlineName));
    if (existing) {
      const fields = [];
      const values = [];
      if (!existing.companyid && company?.id) {
        values.push(company.id);
        fields.push(`companyid = $${values.length}`);
      }
      if (sale?.id) {
        values.push(sale.id);
        fields.push(`salestaffid = COALESCE(salestaffid, $${values.length})`);
      }
      if (fields.length > 0) {
        values.push(existing.id);
        await client.query(`UPDATE partners SET ${fields.join(', ')}, lastupdated = NOW() WHERE id = $${values.length}`, values);
        updated += 1;
      }
      continue;
    }
    const customer = {
      id: crypto.randomUUID(),
      displayname: profile.name || profile.phone,
      name: profile.name || profile.phone,
      namenosign: noSign(profile.name || profile.phone),
      phone: profile.phone,
      customer: true,
      supplier: false,
      isagent: false,
      isinsurance: false,
      companyid: company?.id || null,
      ref: `COS-HOSO-${profile.rowNumber}`,
      comment: makeImportedNote('Imported cosmetic profile', profile),
      note: profile.note || null,
      active: true,
      employee: false,
      date: profile.intakeDate || null,
      datecreated: profile.intakeDate || new Date(),
      lastupdated: new Date(),
      iscompany: false,
      ishead: false,
      isbusinessinvoice: false,
      isdeleted: false,
      isdoctor: false,
      isassistant: false,
      isreceptionist: false,
      salestaffid: sale?.id || null,
      lob_scope: ['cosmetic'],
      is_ctv: false,
    };
    await insertPartner(client, customer);
    if (!maps.customersByPhone.has(profile.phone)) maps.customersByPhone.set(profile.phone, []);
    maps.customersByPhone.get(profile.phone).push(customer);
    created += 1;
  }
  return { created, updated };
}

async function insertDeposit(client, deposit, customerId) {
  const cashAmount = deposit.method === 'cash' ? deposit.amount : 0;
  const bankAmount = deposit.method === 'bank_transfer' ? deposit.amount : 0;
  await client.query(
    `INSERT INTO payments (
      id, customer_id, amount, method, notes, payment_date, reference_code,
      status, deposit_used, cash_amount, bank_amount, deposit_type,
      receipt_number, payment_category
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'posted',0,$8,$9,'deposit',NULL,'deposit')`,
    [
      crypto.randomUUID(),
      customerId,
      deposit.amount,
      deposit.method,
      makeImportedNote('Imported cosmetic deposit', deposit),
      deposit.depositDate || null,
      deposit.referenceCode,
      cashAmount,
      bankAmount,
    ],
  );
}

async function applyDeposits(client, source, maps) {
  let created = 0;
  let skipped = 0;
  let manualReview = 0;
  for (const deposit of source.deposits) {
    if (maps.paymentRefs.has(deposit.referenceCode)) {
      skipped += 1;
      continue;
    }
    const customer = firstExisting(maps.customersByPhone, deposit.phone);
    if (!customer || deposit.amount <= 0) {
      manualReview += 1;
      continue;
    }
    await insertDeposit(client, deposit, customer.id);
    maps.paymentRefs.add(deposit.referenceCode);
    created += 1;
  }
  return { created, skipped, manualReview };
}

module.exports = {
  applyCustomers,
  applyDeposits,
  buildMapsFromSnapshot,
  ensureCompanies,
  ensureProducts,
  ensureStaff,
  firstExisting,
  makeImportedNote,
};
