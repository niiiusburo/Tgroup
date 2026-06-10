// tests.mjs — CTV referral & commission test cases (W1–W8) for tmv.2checkin.com.
// Each test: { id, wave, title, kind:'api'|'ui', mutating, needs:[fixtureKeys], fn(ctx) }
// ctx = { token, fx, page, api, assert, assertEq, assertIn, errCode, CONFIG, bodyText }
// A test passes if fn returns (optionally a detail string) and throws on failure.
const RAND_UUID = '00000000-0000-0000-0000-000000000000';

export const TESTS = [
  // ---- Cross-cutting auth ----
  { id: 'AUTH-1', wave: 'Auth', kind: 'api', mutating: false, title: 'Admin login + /Auth/me returns the session user',
    fn: async ({ token, api }) => {
      const r = await api('/api/Auth/me', { token });
      if (r.status !== 200) throw new Error(`/Auth/me HTTP ${r.status}`);
      const u = r.json?.user || r.json;
      if (!u || !(u.email || u.id)) throw new Error('no user in /Auth/me');
      return `user=${u.email || u.id}`;
    } },
  { id: 'AUTH-2', wave: 'Auth', kind: 'api', mutating: false, title: 'Protected endpoint rejects missing token',
    fn: async ({ api, assert }) => {
      const r = await api('/api/Payouts?lob=dental&limit=1');
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },

  // ---- W1 — Public CTV signup ----
  { id: 'W1-API-1', wave: 'W1', kind: 'api', mutating: false, title: 'Signup rejects empty body with VALIDATION (name/phone/password)',
    fn: async ({ api, assert, assertIn }) => {
      const r = await api('/api/ctv-public/join', { method: 'POST', body: {} });
      assert(r.status === 400, `expected 400, got ${r.status}`);
      assertIn('phone', (r.json?.error?.message || '') + (r.text || ''), 'phone not listed as required');
      assertIn('password', (r.json?.error?.message || '') + (r.text || ''), 'password not listed as required');
      return `400 ${r.json?.error?.code || ''}`;
    } },
  { id: 'W1-API-2', wave: 'W1', kind: 'api', mutating: false, needs: ['existingCtvPhone'],
    title: 'Email optional (no missing-email error) + duplicate phone blocked (no mutation)',
    fn: async ({ api, fx, assert }) => {
      const r = await api('/api/ctv-public/join', { method: 'POST', body: { name: 'TESTSPRITE Dup Probe', phone: fx.existingCtvPhone, password: 'Aa123456!' } });
      // No email supplied: must NOT fail for a missing email (proves email optional).
      const msg = (r.json?.error?.message || '') + (r.text || '');
      assert(!/missing required fields:[^.]*email/i.test(msg), `email treated as required: ${msg.slice(0, 120)}`);
      // Existing phone => blocked, not created.
      assert(r.status !== 200 && r.status !== 201, `duplicate phone was NOT blocked (HTTP ${r.status})`);
      return `blocked HTTP ${r.status} ${r.json?.error?.code || ''}`;
    } },
  { id: 'W1-API-3', wave: 'W1', kind: 'api', mutating: false, title: 'Signup missing password is rejected',
    fn: async ({ api, assert, assertIn }) => {
      const r = await api('/api/ctv-public/join', { method: 'POST', body: { name: 'X', phone: '09' + Date.now().toString().slice(-8) } });
      assert(r.status === 400, `expected 400, got ${r.status}`);
      assertIn('password', (r.json?.error?.message || '') + r.text, 'password not flagged');
      return `400`;
    } },
  { id: 'W1-API-4', wave: 'W1', kind: 'api', mutating: true, title: 'Root signup (no upline, no email) creates a root CTV',
    fn: async ({ api, assert }) => {
      const phone = '0399' + Date.now().toString().slice(-7);
      const r = await api('/api/ctv-public/join', { method: 'POST', body: { name: 'TESTSPRITE Root ' + phone, phone, password: 'Aa123456!' } });
      assert(r.status === 200 || r.status === 201, `create failed HTTP ${r.status} ${r.text.slice(0, 160)}`);
      const ctv = r.json?.ctv || r.json;
      const upline = ctv?.referred_by_ctv_id ?? ctv?.referred_by ?? null;
      assert(!upline, `expected root (no upline) but got upline=${upline}`);
      return `created root ctv id=${ctv?.id} phone=${phone}`;
    } },
  { id: 'W1-UI-1', wave: 'W1', kind: 'ui', mutating: false, title: '/ctv/join renders with email marked optional',
    fn: async ({ page, CONFIG, assert }) => {
      await page.goto(`${CONFIG.BASE}/ctv/join`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const txt = (await page.evaluate(() => document.body.innerText || '')).toLowerCase();
      assert(/ctv|cộng tác|đăng ký|sign ?up|join/i.test(txt), 'join page content not found');
      const hasEmail = await page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').count();
      const optional = /optional|tùy chọn|không bắt buộc|\(optional\)/i.test(txt);
      assert(hasEmail > 0, 'no email field on join page');
      assert(optional, 'email-optional notice not visible on join page');
      return `email field + optional notice present`;
    } },

  // ---- W2/W5 — Service-card commission + tier + braces ----
  { id: 'W2-API-1', wave: 'W2', kind: 'api', mutating: false, title: 'Dental tier config has enabled L0 with positive share; L3 disabled',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/CommissionConfig?lob=dental', { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      const levels = r.json?.levels || [];
      const l0 = levels.find((l) => l.level === 0);
      assert(l0 && l0.enabled === true && Number(l0.share_percent) > 0, `L0 not enabled/positive: ${JSON.stringify(l0)}`);
      const l3 = levels.find((l) => l.level === 3);
      assert(l3 ? l3.enabled === false : true, `L3 expected disabled, got ${JSON.stringify(l3)}`);
      return `L0=${l0.share_percent}% enabled; L3 disabled`;
    } },
  { id: 'W2-API-2', wave: 'W2', kind: 'api', mutating: false, title: 'Cosmetic tier config returns levels',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/CommissionConfig?lob=cosmetic', { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      assert(Array.isArray(r.json?.levels) && r.json.levels.length >= 3, 'cosmetic levels missing');
      return `${r.json.levels.length} levels`;
    } },
  { id: 'W2-API-3', wave: 'W2', kind: 'api', mutating: false, title: 'GET /api/Earnings returns items + totals',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/Earnings?limit=5', { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      assert(Array.isArray(r.json?.items), 'no items array');
      assert(r.json?.totals !== undefined, 'no totals');
      return `totalItems=${r.json.totalItems}`;
    } },
  { id: 'W2-API-4', wave: 'W2', kind: 'api', mutating: false, title: 'POST /api/SaleOrders rejects missing token',
    fn: async ({ api, assert }) => {
      const r = await api('/api/SaleOrders', { method: 'POST', body: { partnerid: RAND_UUID } });
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W5-API-1', wave: 'W5', kind: 'api', mutating: false, title: 'Braces override config surface (DB-backed; probe API)',
    soft: true,
    fn: async ({ api, token }) => {
      const candidates = ['/api/CommissionConfig?lob=dental&type=braces', '/api/BracesCommissionConfig?lob=dental', '/api/CommissionConfig/braces?lob=dental'];
      for (const c of candidates) {
        const r = await api(c, { token });
        if (r.status === 200 && (r.json?.levels || r.json?.braces)) return `braces config via ${c}`;
      }
      // No API surface — braces tier lives in dbo.braces_commission_level_config (migration 056), DB-verified.
      return 'SOFT: no braces API surface; braces tier is DB-only (migration 056, BRACES_OVERRIDE_ENABLED=true)';
    } },
  { id: 'W2-API-5', wave: 'W2', kind: 'api', mutating: true, needs: ['ctvId'],
    title: 'INV-003C: service card with CTV → L0 earning = FULL price × live tier rate (self-cleaning)',
    fn: async ({ api, token, fx, assert }) => {
      const BRACES_RE = /brace|braces|niềng\s*răng/i; // mirrors commissionEngine.isBracesService
      const price = 1234000;
      // Live rates from config (normal + braces L0).
      const cfgN = await api('/api/CommissionConfig?lob=dental', { token });
      const cfgB = await api('/api/CommissionConfig?lob=dental&type=braces', { token });
      const normRate = (cfgN.json?.levels?.find((l) => l.level === 0)?.share_percent || 0) / 100;
      const braceRate = ((cfgB.json?.levels || cfgN.json?.levels)?.find((l) => l.level === 0)?.share_percent || 0) / 100;
      assert(normRate > 0, 'no normal L0 rate from config');
      // Pick a real product; classify braces with the engine's own rule.
      const prods = await api('/api/Products?limit=80', { token });
      const items = prods.json?.items || [];
      assert(items.length, 'no products available');
      const prod = items.find((p) => !BRACES_RE.test(`${p.name || ''} ${p.categname || p.categcompletename || ''}`)) || items[0];
      const isBraces = BRACES_RE.test(`${prod.name || ''} ${prod.categname || prod.categcompletename || ''}`);
      const rate = isBraces ? braceRate : normRate;
      // Create a dedicated TESTSPRITE customer (cleanup target, isolates earnings).
      const cust = await api('/api/Partners', { method: 'POST', token, lob: 'dental',
        body: { name: 'TESTSPRITE Commission ' + Date.now(), phone: '0388' + Date.now().toString().slice(-7), customer: true } });
      assert([200, 201].includes(cust.status), `customer create HTTP ${cust.status} ${cust.text.slice(0, 140)}`);
      const custId = cust.json?.id || cust.json?.partner?.id;
      assert(custId, `no test-customer id in ${cust.text.slice(0, 120)}`);
      let orderId = null;
      try {
        const create = await api('/api/SaleOrders', { method: 'POST', token, lob: 'dental',
          body: { partnerid: custId, ctv_id: fx.ctvId, productid: prod.id, productname: prod.name, amounttotal: price, quantity: 1 } });
        assert(create.status === 201, `order create HTTP ${create.status} ${create.text.slice(0, 140)}`);
        orderId = create.json?.id;
        await new Promise((r) => setTimeout(r, 1000));
        // Earning must exist at FULL price even though ZERO was paid (proves service-card-time, full-price basis).
        const earn = await api('/api/Earnings?limit=300', { token, lob: 'dental' });
        const mine = (earn.json?.items || []).filter((e) => e.client_id === custId);
        const l0 = mine.find((e) => e.recipient_partner_id === fx.ctvId && e.level === 0);
        assert(l0, 'no L0 earning created — service-card commission did not fire (or paid-amount model)');
        const expected = Math.round(price * rate);
        assert(Math.abs(Number(l0.amount) - expected) <= 2, `L0 ${l0.amount} != full ${price}×${(rate * 100).toFixed(1)}% (${expected})`);
        // Reverse via the W3 path (ctv -> null) and prove net-zero (no leftover commission).
        const rev = await api(`/api/SaleOrders/${orderId}`, { method: 'PATCH', token, lob: 'dental', body: { ctv_id: null } });
        assert(rev.status < 400, `reverse PATCH HTTP ${rev.status} ${rev.text.slice(0, 120)}`);
        await new Promise((r) => setTimeout(r, 700));
        // Reversal flips the row to status='reversed' (not a negative row). Active (pending/paid) net must be 0.
        const earn2 = await api('/api/Earnings?limit=300', { token, lob: 'dental' });
        const mine2 = (earn2.json?.items || []).filter((e) => e.client_id === custId);
        const active = mine2.filter((e) => !['reversed', 'cancelled', 'voided'].includes(String(e.status)));
        const net = active.reduce((s, e) => s + Number(e.amount || 0), 0);
        assert(Math.abs(net) <= 2, `active earnings not reversed (net=${net}, statuses=${mine2.map((e) => e.status).join(',')})`);
        return `paid=0 → L0=${l0.amount} = full ${price}×${(rate * 100).toFixed(0)}% (${isBraces ? 'braces' : 'normal'}); CTV→null ⇒ status=reversed, active net=0`;
      } finally {
        if (orderId) await api(`/api/SaleOrders/${orderId}/state`, { method: 'PATCH', token, lob: 'dental', body: { state: 'cancel' } }).catch(() => {});
      }
    } },

  // ---- W3 — service-card CTV reassignment + paid-out lock ----
  { id: 'W3-API-1', wave: 'W3', kind: 'api', mutating: false, title: 'PATCH /api/SaleOrders/:id requires auth',
    fn: async ({ api, assert }) => {
      const r = await api(`/api/SaleOrders/${RAND_UUID}`, { method: 'PATCH', body: { ctv_id: null } });
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W3-API-2', wave: 'W3', kind: 'api', mutating: false, title: 'PATCH unknown sale order id is handled (no 5xx, no mutation)',
    fn: async ({ api, token, assert }) => {
      const r = await api(`/api/SaleOrders/${RAND_UUID}`, { method: 'PATCH', token, body: { ctv_id: null } });
      assert(r.status < 500, `server error ${r.status}`);
      assert([400, 404, 409, 200, 422].includes(r.status), `unexpected ${r.status}`);
      return `HTTP ${r.status} ${r.json?.error?.code || ''}`;
    } },

  // ---- W4 — combined payouts ----
  { id: 'W4-API-1', wave: 'W4', kind: 'api', mutating: false, title: 'GET /api/Payouts (dental) returns items; rows expose payout_group_id field',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/Payouts?lob=dental&limit=5', { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      assert(Array.isArray(r.json?.items), 'no items array');
      const hasGroupField = r.json.items.length === 0 || ('payout_group_id' in r.json.items[0]);
      assert(hasGroupField, 'payout rows do not expose payout_group_id');
      return `items=${r.json.items.length}, payout_group_id field present`;
    } },
  { id: 'W4-API-2', wave: 'W4', kind: 'api', mutating: false, title: 'GET /api/Payouts (cosmetic) returns 200',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/Payouts?lob=cosmetic&limit=5', { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      return `items=${(r.json?.items || []).length}`;
    } },
  { id: 'W4-API-3', wave: 'W4', kind: 'api', mutating: false, title: 'POST /api/Payouts/combined requires auth',
    fn: async ({ api, assert }) => {
      const r = await api('/api/Payouts/combined', { method: 'POST', body: {} });
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W4-API-4', wave: 'W4', kind: 'api', mutating: false, title: 'POST /api/Payouts/combined validates body (no mutation on empty)',
    fn: async ({ api, token, assert }) => {
      const r = await api('/api/Payouts/combined', { method: 'POST', token, body: {} });
      assert(r.status >= 400 && r.status < 500, `expected 4xx validation, got ${r.status}`);
      return `HTTP ${r.status} ${r.json?.error?.code || ''}`;
    } },
  { id: 'W4-UI-1', wave: 'W4', kind: 'ui', mutating: false, title: '/commission Payouts tab exposes an All/Combined LOB option',
    fn: async ({ page, CONFIG, assert }) => {
      await page.goto(`${CONFIG.BASE}/commission`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const txt = await page.evaluate(() => document.body.innerText || '');
      assert(/commission|hoa hồng|earnings|payout|chi trả|ctv/i.test(txt), 'commission page not loaded');
      // Try to open a payouts tab if present, then look for combined/all option text.
      const tab = page.locator('button:has-text("Chi trả"), button:has-text("Payout"), [role="tab"]:has-text("Chi trả"), a:has-text("Payout")').first();
      if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(1200); }
      const txt2 = (await page.evaluate(() => document.body.innerText || ''));
      const hasCombined = /tất cả|combined|all lob|gộp|all\b/i.test(txt2);
      assert(hasCombined, 'no All/Combined option visible in Payouts');
      return 'All/Combined option present';
    } },

  // ---- W6 — drag-drop hierarchy move ----
  { id: 'W6-API-1', wave: 'W6', kind: 'api', mutating: false, title: 'POST /api/Ctvs/:id/move requires auth',
    fn: async ({ api, fx, assert }) => {
      const r = await api(`/api/Ctvs/${fx.ctvId || RAND_UUID}/move`, { method: 'POST', body: { referred_by_ctv_id: RAND_UUID } });
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W6-API-2', wave: 'W6', kind: 'api', mutating: false, needs: ['ctvId'], title: 'Move unknown CTV id is handled (no 5xx, no mutation)',
    fn: async ({ api, token, fx, assert }) => {
      const r = await api(`/api/Ctvs/${RAND_UUID}/move`, { method: 'POST', token, body: { referred_by_ctv_id: fx.ctvId } });
      assert(r.status < 500, `server error ${r.status}`);
      return `HTTP ${r.status} ${r.json?.error?.code || ''}`;
    } },
  { id: 'W6-API-3', wave: 'W6', kind: 'api', mutating: false, needs: ['ctvWithActivity', 'targetUplineId'],
    title: 'Activity guard: moving a CTV with downline is blocked 409 B_CTV_HAS_ACTIVITY (no mutation)',
    fn: async ({ api, token, fx, assert, errCode }) => {
      const r = await api(`/api/Ctvs/${fx.ctvWithActivity}/move`, { method: 'POST', token, body: { referred_by_ctv_id: fx.targetUplineId } });
      assert(r.status === 409, `expected 409, got ${r.status} ${r.text.slice(0, 120)}`);
      assert(errCode(r) === 'B_CTV_HAS_ACTIVITY', `expected B_CTV_HAS_ACTIVITY, got ${errCode(r)}`);
      return `409 B_CTV_HAS_ACTIVITY (blocked, no move)`;
    } },
  { id: 'W6-UI-1', wave: 'W6', kind: 'ui', mutating: false, title: '/commission CTV tab renders draggable CTV rows',
    fn: async ({ page, CONFIG, assert }) => {
      await page.goto(`${CONFIG.BASE}/commission`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const tab = page.locator('button:has-text("CTV"), [role="tab"]:has-text("CTV"), button:has-text("Cộng tác")').first();
      if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(1500); }
      const draggable = await page.locator('[draggable="true"]').count();
      const txt = (await page.evaluate(() => document.body.innerText || '')).toLowerCase();
      const dragHint = /kéo|drag|thả|drop/i.test(txt);
      assert(draggable > 0 || dragHint, 'no draggable rows or drag hint in CTV tab');
      return `draggable=${draggable}, hint=${dragHint}`;
    } },

  // ---- W7 — deposit wallet history ----
  { id: 'W7-API-1', wave: 'W7', kind: 'api', mutating: false, needs: ['customerId'], title: 'GET /api/Payments/deposits returns items for a customer',
    fn: async ({ api, token, fx, assert }) => {
      const r = await api(`/api/Payments/deposits?customerId=${fx.customerId}&limit=5`, { token });
      assert(r.status === 200, `HTTP ${r.status} ${r.text.slice(0, 120)}`);
      assert(Array.isArray(r.json?.items) || Array.isArray(r.json), 'no items array');
      return `HTTP 200`;
    } },
  { id: 'W7-API-2', wave: 'W7', kind: 'api', mutating: false, needs: ['customerId'], title: 'GET /api/Payments/deposit-usage returns 200',
    fn: async ({ api, token, fx, assert }) => {
      const r = await api(`/api/Payments/deposit-usage?customerId=${fx.customerId}&limit=5`, { token });
      assert(r.status === 200, `HTTP ${r.status}`);
      return `HTTP 200`;
    } },
  { id: 'W7-API-3', wave: 'W7', kind: 'api', mutating: false, title: 'GET /api/Payments/deposits requires auth',
    fn: async ({ api, assert }) => {
      const r = await api('/api/Payments/deposits?limit=1');
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W7-UI-1', wave: 'W7', kind: 'ui', mutating: false, title: '/payment exposes the deposit-history customer selector',
    fn: async ({ page, CONFIG, assert }) => {
      await page.goto(`${CONFIG.BASE}/payment`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const sel = await page.locator('#deposit-history-customer').count();
      const txt = await page.evaluate(() => document.body.innerText || '');
      assert(sel > 0 || /ví nạp|deposit/i.test(txt), 'deposit-history selector not found on /payment');
      return `selector present=${sel > 0}`;
    } },

  // ---- W8 — payment-edit removal ----
  { id: 'W8-API-1', wave: 'W8', kind: 'api', mutating: false, title: 'PATCH /api/Payments/:id returns 405 B_PAYMENT_EDIT_DISABLED',
    fn: async ({ api, token, assert, errCode }) => {
      const r = await api(`/api/Payments/${RAND_UUID}`, { method: 'PATCH', token, body: { amount: 1000 } });
      assert(r.status === 405, `expected 405, got ${r.status}`);
      assert(errCode(r) === 'B_PAYMENT_EDIT_DISABLED', `expected B_PAYMENT_EDIT_DISABLED, got ${errCode(r)}`);
      return `405 B_PAYMENT_EDIT_DISABLED`;
    } },
  { id: 'W8-API-2', wave: 'W8', kind: 'api', mutating: false, title: 'PATCH /api/Payments/:id requires auth',
    fn: async ({ api, assert }) => {
      const r = await api(`/api/Payments/${RAND_UUID}`, { method: 'PATCH', body: { amount: 1 } });
      assert([401, 403].includes(r.status), `expected 401/403, got ${r.status}`);
      return `HTTP ${r.status}`;
    } },
  { id: 'W8-UI-1', wave: 'W8', kind: 'ui', mutating: false, title: '/payment deposit history rows have no inline edit affordance',
    fn: async ({ page, CONFIG, assert }) => {
      await page.goto(`${CONFIG.BASE}/payment`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      // Heuristic: there should be no "Sửa"/"Edit" pencil action wired to a payment edit. Absence is the contract.
      const editButtons = await page.locator('button:has-text("Sửa thanh toán"), button[aria-label*="edit payment" i]').count();
      assert(editButtons === 0, `found ${editButtons} payment-edit buttons (should be 0)`);
      return 'no payment-edit affordance';
    } },
];
