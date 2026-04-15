const { query } = require('./src/db');

async function check() {
  const cols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'partners' AND table_schema = 'dbo'
    ORDER BY ordinal_position
  `);
  console.log('Partners columns with tier/job/level:');
  cols.filter(c => c.column_name.includes('tier') || c.column_name.includes('job') || c.column_name.includes('level') || c.column_name.includes('rank') || c.column_name.includes('grade') || c.column_name.includes('type'))
      .forEach(c => console.log(' ', c.column_name, c.data_type));
  
  const hrjobsCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'hrjobs' AND table_schema = 'dbo'
    ORDER BY ordinal_position
  `);
  console.log('\nHR Jobs columns:');
  hrjobsCols.forEach(c => console.log(' ', c.column_name, c.data_type));
  
  const jobs = await query('SELECT id, name FROM hrjobs ORDER BY name');
  console.log('\nHR Jobs data:', jobs.length);
  jobs.forEach(j => console.log(' ', j.id, j.name));
  
  // Check partners for hrjobid usage
  const partnersWithJob = await query(`
    SELECT p.name, p.hrjobid, h.name as job_name
    FROM partners p
    LEFT JOIN hrjobs h ON h.id = p.hrjobid
    WHERE p.employee = true AND p.isdeleted = false
    ORDER BY h.name NULLS LAST, p.name
    LIMIT 50
  `);
  console.log('\nSample employees with jobs:');
  partnersWithJob.forEach(p => console.log(' ', p.name, '|', p.job_name || 'NO JOB', '| hrjobid:', p.hrjobid));
  
  // Count employees by hrjob
  const jobCounts = await query(`
    SELECT h.name as job_name, COUNT(*) as count
    FROM partners p
    LEFT JOIN hrjobs h ON h.id = p.hrjobid
    WHERE p.employee = true AND p.isdeleted = false
    GROUP BY h.name
    ORDER BY count DESC
  `);
  console.log('\nEmployee counts by job:');
  jobCounts.forEach(j => console.log(' ', j.job_name || 'NO JOB', ':', j.count));
}

check().catch(console.error).finally(() => process.exit());
