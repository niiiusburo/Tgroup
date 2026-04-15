/**
 * Test script: Verify every active employee's resolved permissions and locations.
 * Simulates the exact logic from api/src/routes/auth.js::resolvePermissions()
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from api/.env manually (dotenv may not be installed at root)
function loadDatabaseUrl() {
  const envPath = path.join(__dirname, '../api/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error('DATABASE_URL not found in api/.env');
  return match[1].trim();
}

const pool = new Pool({
  connectionString: loadDatabaseUrl(),
  options: '-c search_path=dbo',
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function resolvePermissions(employeeId) {
  const epRows = await query(
    `SELECT ep.group_id, pg.name AS group_name
     FROM employee_permissions ep
     JOIN permission_groups pg ON pg.id = ep.group_id
     WHERE ep.employee_id = $1`,
    [employeeId]
  );

  if (!epRows || epRows.length === 0) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  const { group_id: groupId, group_name: groupName } = epRows[0];

  const [basePermRows, overrideRows, locRows] = await Promise.all([
    query(
      `SELECT permission FROM group_permissions WHERE group_id = $1 ORDER BY permission`,
      [groupId]
    ),
    query(
      `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
    query(
      `SELECT c.id, c.name
       FROM employee_location_scope els
       JOIN companies c ON c.id = els.company_id
       WHERE els.employee_id = $1`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map((r) => r.permission);
  const granted = overrideRows.filter((r) => r.override_type === 'grant').map((r) => r.permission);
  const revoked = overrideRows.filter((r) => r.override_type === 'revoke').map((r) => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return {
    groupId,
    groupName,
    effectivePermissions: [...effectiveSet].sort(),
    locations: locRows.map((l) => ({ id: l.id, name: l.name })),
  };
}

async function main() {
  console.log('🔍 Testing all active employee permissions...\n');

  const employees = await query(
    `SELECT p.id, p.name, p.email, p.jobtitle, p.active, p.companyid, c.name AS company_name
     FROM partners p
     LEFT JOIN companies c ON c.id = p.companyid
     WHERE p.employee = true
     ORDER BY p.active DESC, COALESCE(c.name, ''), p.name`
  );

  const results = [];
  const anomalies = [];

  for (const emp of employees) {
    const perms = await resolvePermissions(emp.id);

    const record = {
      id: emp.id,
      name: emp.name,
      email: emp.email || '(no email)',
      jobtitle: emp.jobtitle || '(no jobtitle)',
      active: emp.active,
      company: emp.company_name || '(no company)',
      tier: perms.groupName || '(NO TIER)',
      permissionCount: perms.effectivePermissions.length,
      permissions: perms.effectivePermissions,
      locationCount: perms.locations.length,
      locations: perms.locations.map((l) => l.name),
    };

    results.push(record);

    // Detect anomalies
    if (emp.active && !perms.groupName) {
      anomalies.push({
        type: 'ACTIVE_BUT_NO_TIER',
        employee: record.name,
        email: record.email,
        reason: 'Employee is active but has no permission group assigned',
      });
    }

    if (emp.active && perms.groupName && perms.locations.length === 0) {
      anomalies.push({
        type: 'ACTIVE_BUT_NO_LOCATIONS',
        employee: record.name,
        email: record.email,
        tier: record.tier,
        reason: 'Employee has permissions but zero location access',
      });
    }

    if (!emp.active && perms.groupName) {
      anomalies.push({
        type: 'INACTIVE_BUT_HAS_TIER',
        employee: record.name,
        email: record.email,
        tier: record.tier,
        reason: 'Employee is inactive but still has permissions assigned',
      });
    }

    if (record.tier === 'Admin' && record.permissionCount < 30) {
      anomalies.push({
        type: 'ADMIN_WITH_FEW_PERMS',
        employee: record.name,
        tier: record.tier,
        permissionCount: record.permissionCount,
        reason: 'Admin tier should have 30+ permissions',
      });
    }

    if (record.tier === 'Dentist' && record.locationCount > 1) {
      anomalies.push({
        type: 'DENTIST_WITH_MULTIPLE_LOCATIONS',
        employee: record.name,
        tier: record.tier,
        locations: record.locations,
        reason: 'Dentist should typically have exactly 1 location unless manager',
      });
    }
  }

  // Build summary
  const activeWithPerms = results.filter((r) => r.active && r.tier !== '(NO TIER)');
  const activeWithoutPerms = results.filter((r) => r.active && r.tier === '(NO TIER)');
  const inactiveWithPerms = results.filter((r) => !r.active && r.tier !== '(NO TIER)');
  const inactiveWithoutPerms = results.filter((r) => !r.active && r.tier === '(NO TIER)');

  const tierSummary = {};
  for (const r of results) {
    if (!tierSummary[r.tier]) tierSummary[r.tier] = { count: 0, active: 0, inactive: 0, avgPerms: 0, avgLocs: 0, records: [] };
    tierSummary[r.tier].count++;
    if (r.active) tierSummary[r.tier].active++;
    else tierSummary[r.tier].inactive++;
    tierSummary[r.tier].records.push(r);
  }

  for (const tier of Object.keys(tierSummary)) {
    const recs = tierSummary[tier].records;
    tierSummary[tier].avgPerms = recs.reduce((sum, r) => sum + r.permissionCount, 0) / recs.length;
    tierSummary[tier].avgLocs = recs.reduce((sum, r) => sum + r.locationCount, 0) / recs.length;
    delete tierSummary[tier].records;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEmployees: employees.length,
      activeWithPermissions: activeWithPerms.length,
      activeWithoutPermissions: activeWithoutPerms.length,
      inactiveWithPermissions: inactiveWithPerms.length,
      inactiveWithoutPermissions: inactiveWithoutPerms.length,
      totalAnomalies: anomalies.length,
    },
    tierSummary,
    anomalies,
    detailSamples: {
      admin: results.find((r) => r.tier === 'Admin'),
      clinicManager: results.find((r) => r.tier === 'Clinic Manager'),
      dentist: results.find((r) => r.tier === 'Dentist'),
      dentalAssistant: results.find((r) => r.tier === 'Dental Assistant'),
      receptionist: results.find((r) => r.tier === 'Receptionist'),
      activeNoTier: activeWithoutPerms.slice(0, 5),
    },
    fullResults: results,
  };

  const outFile = path.join(__dirname, '../test-results/permission_audit_report.json');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  // Console output
  console.log('═'.repeat(70));
  console.log(' PERMISSION AUDIT REPORT');
  console.log('═'.repeat(70));
  console.log(`
Total employees tested: ${employees.length}
  ✅ Active with permissions:    ${activeWithPerms.length}
  ⚠️  Active without permissions: ${activeWithoutPerms.length}
  🚫 Inactive with permissions:  ${inactiveWithPerms.length}
  🚫 Inactive without permissions:${inactiveWithoutPerms.length}
  🔴 Anomalies detected:         ${anomalies.length}
`);

  console.log('─'.repeat(70));
  console.log(' TIER BREAKDOWN');
  console.log('─'.repeat(70));
  console.log(`${'Tier'.padEnd(20)} ${'Total'.padStart(6)} ${'Active'.padStart(6)} ${'Inactive'.padStart(8)} ${'Avg Perms'.padStart(10)} ${'Avg Locs'.padStart(10)}`);
  console.log('─'.repeat(70));
  for (const [tier, stats] of Object.entries(tierSummary).sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `${tier.padEnd(20)} ${String(stats.count).padStart(6)} ${String(stats.active).padStart(6)} ${String(stats.inactive).padStart(8)} ${stats.avgPerms.toFixed(1).padStart(10)} ${stats.avgLocs.toFixed(1).padStart(10)}`
    );
  }

  if (anomalies.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log(' ANOMALIES (' + anomalies.length + ')');
    console.log('─'.repeat(70));
    for (const a of anomalies) {
      console.log(`\n[${a.type}] ${a.employee} (${a.email || 'no email'})`);
      if (a.tier) console.log(`  Tier: ${a.tier}`);
      if (a.permissionCount !== undefined) console.log(`  Permissions: ${a.permissionCount}`);
      if (a.locations) console.log(`  Locations: ${a.locations.join(', ')}`);
      console.log(`  Reason: ${a.reason}`);
    }
  } else {
    console.log('\n✅ No anomalies detected.');
  }

  console.log('\n' + '─'.repeat(70));
  console.log(' SAMPLE RECORDS');
  console.log('─'.repeat(70));

  const samples = [
    { label: 'Admin', rec: report.detailSamples.admin },
    { label: 'Clinic Manager', rec: report.detailSamples.clinicManager },
    { label: 'Dentist', rec: report.detailSamples.dentist },
    { label: 'Dental Assistant', rec: report.detailSamples.dentalAssistant },
    { label: 'Receptionist', rec: report.detailSamples.receptionist },
  ];

  for (const { label, rec } of samples) {
    if (rec) {
      console.log(`\n${label}:`);
      console.log(`  Name:  ${rec.name}`);
      console.log(`  Email: ${rec.email}`);
      console.log(`  Tier:  ${rec.tier}`);
      console.log(`  Perms: ${rec.permissionCount}`);
      console.log(`  Locs:  ${rec.locationCount} → ${rec.locations.join(', ')}`);
    }
  }

  if (report.detailSamples.activeNoTier.length > 0) {
    console.log(`\nActive employees WITHOUT permissions (first 5):`);
    for (const rec of report.detailSamples.activeNoTier) {
      console.log(`  - ${rec.name} (${rec.email}) | ${rec.company}`);
    }
  }

  console.log(`\n📄 Full report saved to: ${outFile}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
