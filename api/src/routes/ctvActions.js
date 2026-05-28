'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../db');
const { buildCtvNetwork } = require('../services/ctvNetwork');
const { createReferralStartCard } = require('../services/referralCard');
const { getReferralClaimStatus } = require('../services/referralClaim');
const { safeQueryRows, isAdminCaller, isCtvUser } = require('./ctvHelpers');

async function createCtv(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const isCTV = isCtvUser(req.user);
  const isAdmin = await isAdminCaller(employeeId);
  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'Only CTVs or admins can create new CTVs' },
    });
  }

  const { name, phone, email, password, lob_scope: bodyScope, referred_by_ctv_id: bodyReferredBy } = req.body || {};
  if (!name || !phone || !email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, email, password' },
    });
  }

  const requested = Array.isArray(bodyScope) && bodyScope.length
    ? bodyScope.filter((lob) => lob === 'dental' || lob === 'cosmetic')
    : ['dental'];
  const lobScope = Array.from(new Set(['dental', ...requested]));
  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    const phoneCheckSql = 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1';
    const emailCheckSql = 'SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1';
    const [dPhones, cPhones, dEmails, cEmails] = await Promise.all([
      safeQueryRows(dentalDb, phoneCheckSql, [phone]),
      safeQueryRows(cosmeticDb, phoneCheckSql, [phone]),
      safeQueryRows(dentalDb, emailCheckSql, [email]),
      safeQueryRows(cosmeticDb, emailCheckSql, [email]),
    ]);

    if (dPhones.length > 0 || cPhones.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }
    if (dEmails.length > 0 || cEmails.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);
    const referredById = isCTV && !bodyReferredBy ? employeeId : (bodyReferredBy || null);
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
        active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7,
        true, true, false, false, false, false, false, false,
        false, false, $8, $8
      ) RETURNING id, name, phone, email, is_ctv, lob_scope, referred_by_ctv_id, active, datecreated
    `;
    const params = [id, name, phone, email, passwordHash, lobScope, referredById, now];
    const writes = [safeQueryRows(dentalDb, insertSql, params)];
    if (lobScope.includes('cosmetic')) writes.push(safeQueryRows(cosmeticDb, insertSql, params));
    const results = await Promise.all(writes);
    const created = results[0][0];

    if (!created) return res.status(500).json({ error: 'Failed to create CTV' });
    return res.status(201).json(created);
  } catch (err) {
    console.error('[ctv POST /] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function referClient(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const isCTV = isCtvUser(req.user);
  const isAdmin = await isAdminCaller(employeeId);
  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'Only CTVs or admins can refer clients' },
    });
  }

  const { name, phone, lob: bodyLob, referred_by_ctv_id: bodyReferredBy } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone' },
    });
  }

  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
  const db = getDb(lob);
  const referredById = isCTV && !bodyReferredBy ? employeeId : (bodyReferredBy || null);

  try {
    const duplicate = await safeQueryRows(db, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]);
    if (duplicate.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, lob_scope, referred_by_ctv_id,
        is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5,
        false, true, true, false, false, false, false, false, false,
        false, false, $6, $6
      ) RETURNING id, name, phone, lob_scope, referred_by_ctv_id, customer, active, datecreated
    `;
    const rows = await safeQueryRows(db, insertSql, [id, name, phone, [lob], referredById, now]);
    const created = rows[0];

    if (!created) return res.status(500).json({ error: 'Failed to create client' });
    return res.status(201).json(created);
  } catch (err) {
    console.error('[ctv POST /clients] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getNetwork(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  try {
    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');
    const ctvSql = `
      SELECT id, name, phone, email, active, referred_by_ctv_id, datecreated
      FROM dbo.partners
      WHERE is_ctv = true AND isdeleted = false
    `;
    const [dCtvs, cCtvs, dClientCounts, cClientCounts, dEarnRows, cEarnRows] = await Promise.all([
      safeQueryRows(dentalDb, ctvSql),
      safeQueryRows(cosmeticDb, ctvSql),
      safeQueryRows(dentalDb, 'SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id'),
      safeQueryRows(cosmeticDb, 'SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id'),
      safeQueryRows(dentalDb, 'SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id'),
      safeQueryRows(cosmeticDb, 'SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id'),
    ]);

    return res.json(buildCtvNetwork({
      ctvId: employeeId,
      dentalCtvs: dCtvs,
      cosmeticCtvs: cCtvs,
      dentalClientCounts: dClientCounts,
      cosmeticClientCounts: cClientCounts,
      dentalEarnings: dEarnRows,
      cosmeticEarnings: cEarnRows,
    }));
  } catch (err) {
    console.error('[ctv GET /network] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createBooking(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const isCTV = isCtvUser(req.user);
  const isAdmin = await isAdminCaller(employeeId);
  if (!isCTV && !isAdmin) {
    return res.status(403).json({ error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'CTV only' } });
  }

  const { clientId: bodyClientId, name, phone, lob: bodyLob, date, time, companyId, productId } = req.body || {};
  if (!phone || !date) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone and date are required' } });
  }

  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
  const db = getDb(lob);

  try {
    let clientId = bodyClientId || null;
    if (!clientId) {
      const found = await safeQueryRows(db, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]);
      clientId = found[0]?.id || null;
    }

    if (clientId) {
      const claim = await getReferralClaimStatus(clientId, lob, {});
      if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== employeeId) {
        return res.status(400).json({
          error: {
            code: 'B_CLIENT_CLAIMED',
            message: 'Client already active with another CTV',
            ownerName: claim.ownerName,
            owner_name: claim.ownerName,
            expiresAt: claim.expiresAt,
            expires_at: claim.expiresAt,
          },
        });
      }
    }

    if (!clientId) {
      clientId = crypto.randomUUID();
      const now = new Date().toISOString();
      await safeQueryRows(
        db,
        `INSERT INTO dbo.partners (id, name, phone, lob_scope, referred_by_ctv_id, is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated)
         VALUES ($1,$2,$3,$4,$5,false,true,true,false,false,false,false,false,false,false,false,$6,$6)`,
        [clientId, name || 'Khách CTV', phone, [lob], employeeId, now]
      );
    } else {
      await safeQueryRows(db, 'UPDATE dbo.partners SET referred_by_ctv_id = $1, lastupdated = now() WHERE id = $2', [employeeId, clientId]);
    }

    await createReferralStartCard({ clientId, lob });
    const apptId = crypto.randomUUID();
    const nameResult = await safeQueryRows(
      db,
      "SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1 AS next_seq FROM dbo.appointments WHERE name LIKE 'AP%'"
    );
    const nextSeq = nameResult[0]?.next_seq || 1;
    const apptName = `AP${String(nextSeq).padStart(6, '0')}`;

    await safeQueryRows(
      db,
      `INSERT INTO dbo.appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [apptId, apptName, date, time || null, clientId, null, companyId || null, '', 30, '1', 'confirmed', 'confirmed', productId || null, null, null]
    );

    return res.status(201).json({ clientId, appointmentId: apptId });
  } catch (err) {
    if (err.code === 'REFERRAL_PRODUCT_NOT_CONFIGURED') {
      return res.status(409).json({
        error: { code: 'REFERRAL_PRODUCT_NOT_CONFIGURED', message: 'Admin must configure the Referral Start product first' },
      });
    }
    console.error('[ctv POST /bookings] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createCtv, referClient, getNetwork, createBooking };
