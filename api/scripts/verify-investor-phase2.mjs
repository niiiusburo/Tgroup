#!/usr/bin/env node
/**
 * Investor Portal Phase 2 — automated API verification loop.
 * Run: node api/scripts/verify-investor-phase2.mjs
 * Requires local API on :3002 and tdental_demo with migration 069 applied.
 */
const API = process.env.API_URL || 'http://127.0.0.1:3002/api';
const STAFF_EMAIL = process.env.STAFF_EMAIL || 't@clinic.vn';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || '123123';

const results = [];
let failed = 0;

function log(step, ok, detail = '') {
  results.push({ step, ok, detail });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${step}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

async function jsonFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\nInvestor Phase 2 verification → ${API}\n`);

  const login = await jsonFetch('/Auth/login', {
    method: 'POST',
    body: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
  });
  const staffToken = login.data?.token;
  log('Staff login', login.status === 200 && !!staffToken, `status=${login.status}`);
  if (!staffToken) {
    console.error('\nFAIL: cannot continue without staff token');
    process.exit(1);
  }

  const testEmail = `phase2-${Date.now()}@clinic.vn`;
  const create = await jsonFetch('/admin/investors', {
    method: 'POST',
    token: staffToken,
    body: { email: testEmail, investorName: 'Phase2 Test', lob: 'dental' },
  });
  const investorId = create.data?.investor?.id;
  const initialPassword = create.data?.initialPassword;
  log('Admin create investor', create.status === 201 && !!investorId && !!initialPassword);

  const partners = await jsonFetch('/Partners?limit=1', { token: staffToken });
  const partnerId = partners.data?.items?.[0]?.id;
  log('Fetch sample partner', partners.status === 200 && !!partnerId, partnerId || 'none');

  if (investorId && partnerId) {
    const patchOn = await jsonFetch(`/Partners/${partnerId}/investor-visibility`, {
      method: 'PATCH',
      token: staffToken,
      body: { investorId, isVisible: true },
    });
    log('PATCH visibility ON', patchOn.status === 200 && patchOn.data?.isVisible === true);

    const invLogin = await jsonFetch('/investor/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: initialPassword },
    });
    const invToken = invLogin.data?.token;
    log('Investor login', invLogin.status === 200 && !!invToken);

    if (invToken) {
      const clients = await jsonFetch('/investor/clients', { token: invToken });
      const seen = (clients.data?.items || []).some((c) => c.id === partnerId);
      log('Investor sees shared client', clients.status === 200 && seen, `total=${clients.data?.totalItems}`);
    }

    const patchOff = await jsonFetch(`/Partners/${partnerId}/investor-visibility`, {
      method: 'PATCH',
      token: staffToken,
      body: { investorId, isVisible: false },
    });
    log('PATCH visibility OFF', patchOff.status === 200 && patchOff.data?.isVisible === false);

    if (invToken) {
      const clients2 = await jsonFetch('/investor/clients', { token: invToken });
      const stillSeen = (clients2.data?.items || []).some((c) => c.id === partnerId);
      log('Investor client hidden after OFF', clients2.status === 200 && !stillSeen);
    }
  }

  const resetReq = await jsonFetch('/investor/auth/password-reset-request', {
    method: 'POST',
    body: { email: testEmail },
  });
  const resetToken = resetReq.data?.token;
  log('Password reset request (dev token)', resetReq.status === 200 && !!resetToken);

  const newPass = 'phase2new99';
  if (resetToken) {
    const resetConfirm = await jsonFetch('/investor/auth/password-reset', {
      method: 'POST',
      body: { token: resetToken, password: newPass, confirmPassword: newPass },
    });
    log('Password reset confirm', resetConfirm.status === 200);

    const loginNew = await jsonFetch('/investor/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: newPass },
    });
    log('Investor login with new password', loginNew.status === 200);
  }

  const deactivate = await jsonFetch(`/admin/investors/${investorId}?lob=dental`, {
    method: 'PATCH',
    token: staffToken,
    body: { isActive: false },
  });
  log('Deactivate investor', deactivate.status === 200 && deactivate.data?.investor?.is_active === false);

  const blocked = await jsonFetch('/investor/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: newPass },
  });
  log('Deactivated investor blocked', blocked.status === 403, `status=${blocked.status}`);

  const unknownReset = await jsonFetch('/investor/auth/password-reset-request', {
    method: 'POST',
    body: { email: 'nonexistent-phase2@clinic.vn' },
  });
  log('Reset enumeration-safe', unknownReset.status === 200 && !unknownReset.data?.token);

  console.log(`\n${failed === 0 ? 'VERDICT: PASS' : 'VERDICT: FAIL'} (${results.length - failed}/${results.length} checks)\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});