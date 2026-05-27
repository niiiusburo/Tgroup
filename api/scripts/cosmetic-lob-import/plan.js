const { clean, normalizeText } = require('./normalizers');

function pushAnomaly(anomalies, anomaly) {
  anomalies.push({ severity: anomaly.severity || 'warning', ...anomaly });
}

function buildProfileIndex(profiles, anomalies) {
  const byPhone = new Map();
  for (const profile of profiles) {
    if (!profile.phone) {
      pushAnomaly(anomalies, {
        sheet: profile.sheet,
        rowNumber: profile.rowNumber,
        code: 'profile_missing_phone',
        message: 'Profile row has no usable phone, so it cannot be safely matched.',
      });
      continue;
    }
    const existing = byPhone.get(profile.phone);
    if (existing && normalizeText(existing.name) !== normalizeText(profile.name)) {
      pushAnomaly(anomalies, {
        sheet: profile.sheet,
        rowNumber: profile.rowNumber,
        code: 'profile_duplicate_phone_conflict',
        message: `Phone ${profile.phone} appears with more than one name.`,
        details: { firstRow: existing.rowNumber, firstName: existing.name, duplicateName: profile.name },
      });
      continue;
    }
    if (!existing) byPhone.set(profile.phone, profile);
  }
  return byPhone;
}

function uniqueNeededNames(values, existingMap) {
  const needed = new Map();
  for (const value of values) {
    const name = clean(value);
    const key = normalizeText(name);
    if (!key || existingMap.has(key) || needed.has(key)) continue;
    needed.set(key, { name });
  }
  return [...needed.values()];
}

function customerCandidate(phone, profileIndex, snapshot) {
  const existing = snapshot.customersByPhone.get(phone) || [];
  if (existing.length === 1) return { type: 'existing', customer: existing[0] };
  if (existing.length > 1) return { type: 'ambiguous', matches: existing };
  const profile = profileIndex.get(phone);
  if (profile) return { type: 'profile', profile };
  return { type: 'missing' };
}

function buildCustomerActions(profileIndex, snapshot, anomalies) {
  const customerActions = [];
  for (const profile of profileIndex.values()) {
    const matches = snapshot.customersByPhone.get(profile.phone) || [];
    if (matches.length === 0) {
      customerActions.push({ type: 'create', rowNumber: profile.rowNumber, phone: profile.phone, name: profile.name, branchName: profile.branchName });
    } else if (matches.length === 1) {
      customerActions.push({ type: 'update_from_profile', rowNumber: profile.rowNumber, id: matches[0].id, phone: profile.phone, name: profile.name, branchName: profile.branchName });
    } else {
      pushAnomaly(anomalies, {
        sheet: profile.sheet,
        rowNumber: profile.rowNumber,
        code: 'profile_ambiguous_existing_phone',
        message: `Phone ${profile.phone} matches multiple existing cosmetic customers.`,
        details: { matchCount: matches.length },
      });
    }
  }
  return customerActions;
}

function buildDepositActions(source, profileIndex, snapshot, anomalies) {
  const depositActions = [];
  for (const deposit of source.deposits) {
    const candidate = customerCandidate(deposit.phone, profileIndex, snapshot);
    if (!deposit.phone || deposit.amount <= 0 || candidate.type === 'missing' || candidate.type === 'ambiguous') {
      pushAnomaly(anomalies, {
        sheet: deposit.sheet,
        rowNumber: deposit.rowNumber,
        code: 'deposit_needs_manual_customer_match',
        message: 'Deposit row cannot be safely attached to exactly one cosmetic customer.',
        details: { phone: deposit.phone, amount: deposit.amount, reason: candidate.type },
      });
      depositActions.push({ type: 'manual_review', rowNumber: deposit.rowNumber, phone: deposit.phone, amount: deposit.amount });
      continue;
    }
    depositActions.push({
      type: snapshot.paymentRefs.has(deposit.referenceCode) ? 'skip_existing' : 'create',
      rowNumber: deposit.rowNumber,
      phone: deposit.phone,
      amount: deposit.amount,
      method: deposit.method,
      paymentDate: deposit.depositDate,
      referenceCode: deposit.referenceCode,
    });
  }
  return depositActions;
}

function buildTreatmentAndPaymentActions(source, profileIndex, snapshot, anomalies) {
  const treatmentActions = [];
  const paymentActions = [];
  for (const exam of source.exams) {
    const candidate = customerCandidate(exam.phone, profileIndex, snapshot);
    const missingRequired = !exam.phone || !exam.serviceName || exam.serviceAmount < 0 || !exam.serviceDate;
    if (missingRequired || candidate.type === 'missing' || candidate.type === 'ambiguous') {
      pushAnomaly(anomalies, {
        sheet: exam.sheet,
        rowNumber: exam.rowNumber,
        code: 'exam_needs_manual_customer_or_service_match',
        message: 'Exam row cannot be safely converted to a service/payment record.',
        details: {
          phone: exam.phone,
          serviceName: exam.serviceName,
          serviceDate: exam.serviceDate,
          reason: missingRequired ? 'missing_required_field' : candidate.type,
        },
      });
      treatmentActions.push({ type: 'manual_review', rowNumber: exam.rowNumber, phone: exam.phone, serviceName: exam.serviceName });
      continue;
    }
    treatmentActions.push({
      type: snapshot.orderCodes.has(exam.orderCode) ? 'skip_existing' : 'create',
      rowNumber: exam.rowNumber,
      phone: exam.phone,
      serviceName: exam.serviceName,
      serviceAmount: exam.serviceAmount,
      paidAmount: exam.paidAmount,
      residual: Math.max(0, exam.serviceAmount - exam.paidAmount),
      orderCode: exam.orderCode,
    });
    if (exam.paidAmount > 0) {
      paymentActions.push({
        type: snapshot.paymentRefs.has(exam.paymentReferenceCode) ? 'skip_existing' : 'create',
        rowNumber: exam.rowNumber,
        phone: exam.phone,
        amount: exam.paidAmount,
        method: exam.method,
        paymentDate: exam.paymentDate,
        referenceCode: exam.paymentReferenceCode,
      });
    }
  }
  return { treatmentActions, paymentActions };
}

function buildCosmeticImportPlan(source, snapshot) {
  const anomalies = [];
  const profileIndex = buildProfileIndex(source.profiles, anomalies);
  const branchNames = [
    ...source.profiles.map((row) => row.branchName),
    ...source.exams.map((row) => row.branchName),
  ].filter(Boolean);
  const companyCreates = uniqueNeededNames(branchNames, snapshot.companyByName);
  const staffNames = [
    ...source.profiles.map((row) => row.saleOnlineName),
    ...source.exams.map((row) => row.doctorName),
    ...source.exams.map((row) => row.assistantName),
  ];
  const staffCreates = uniqueNeededNames(staffNames, snapshot.staffByName);
  const productCreates = uniqueNeededNames(source.exams.map((row) => row.serviceName), snapshot.productsByName);
  const customerActions = buildCustomerActions(profileIndex, snapshot, anomalies);
  const depositActions = buildDepositActions(source, profileIndex, snapshot, anomalies);
  const { treatmentActions, paymentActions } = buildTreatmentAndPaymentActions(source, profileIndex, snapshot, anomalies);

  return {
    sourceTabs: source.tabs,
    summary: {
      companies: { create: companyCreates.length },
      staff: { create: staffCreates.length },
      products: { create: productCreates.length },
      customers: {
        create: customerActions.filter((action) => action.type === 'create').length,
        updateFromProfile: customerActions.filter((action) => action.type === 'update_from_profile').length,
      },
      deposits: {
        create: depositActions.filter((action) => action.type === 'create').length,
        skipExisting: depositActions.filter((action) => action.type === 'skip_existing').length,
        manualReview: depositActions.filter((action) => action.type === 'manual_review').length,
      },
      treatments: {
        create: treatmentActions.filter((action) => action.type === 'create').length,
        skipExisting: treatmentActions.filter((action) => action.type === 'skip_existing').length,
        manualReview: treatmentActions.filter((action) => action.type === 'manual_review').length,
      },
      payments: {
        create: paymentActions.filter((action) => action.type === 'create').length,
        skipExisting: paymentActions.filter((action) => action.type === 'skip_existing').length,
      },
      anomalies: anomalies.length,
    },
    fieldMapping: {
      'Hồ sơ': 'tcosmetic_demo.dbo.partners (customer profile, branch, sale/referral notes)',
      'Phiếu cọc': 'tcosmetic_demo.dbo.payments as deposit rows (payment_category=deposit, deposit_type=deposit)',
      'Phiếu khám': 'tcosmetic_demo.dbo.products + saleorders + saleorderlines + payments + payment_allocations',
    },
    actions: {
      companies: companyCreates,
      staff: staffCreates,
      products: productCreates,
      customers: customerActions,
      deposits: depositActions,
      treatments: treatmentActions,
      payments: paymentActions,
    },
    anomalies,
  };
}

module.exports = {
  buildCosmeticImportPlan,
};
