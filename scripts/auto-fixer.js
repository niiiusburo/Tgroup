#!/usr/bin/env node

/**
 * AutoDebugger Fixer Pipeline
 * ============================
 * Fetches unresolved production errors from the backend, uses the
 * code-review-graph knowledge graph to trace root causes, then
 * orchestrates AI-driven fixes via Ralph Loop.
 *
 * Modes:
 *   --daemon        Run continuously, checking every 5 minutes
 *   --once          Fetch and attempt to fix the top unresolved error
 *   --dry-run       Show what would be fixed without making changes
 *   --error <id>    Target a specific error by ID
 *
 * Usage:
 *   node scripts/auto-fixer.js --once          # Fix top error
 *   node scripts/auto-fixer.js --error <id>    # Fix specific error
 *   node scripts/auto-fixer.js --daemon        # Continuous monitoring
 *   node scripts/auto-fixer.js --dry-run       # Preview only
 *
 * Required env vars:
 *   API_URL=http://localhost:3002/api
 *   DATABASE_URL=postgresql://...  (for running tests after fix)
 *   CLAUDE_API_KEY=...             (for AI agent access)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Configuration ──────────────────────────────────────────────────
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3002/api',
  checkIntervalMs: parseInt(process.env.AUTOFIX_INTERVAL || '300000'), // 5 min
  maxConcurrentFixes: 1,
  maxAttemptsPerError: 3,
  minOccurrences: 2, // Only auto-fix errors seen at least 2 times
  projectRoot: path.resolve(__dirname, '..'),
  fixPlanDir: path.resolve(__dirname, '..', '.omc', 'fix-plans'),
};

// ── CLI Args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--daemon') ? 'daemon'
  : args.includes('--once') ? 'once'
  : args.includes('--dry-run') ? 'dry-run'
  : 'once';

const TARGET_ERROR_ID = (() => {
  const idx = args.indexOf('--error');
  return idx >= 0 ? args[idx + 1] : null;
})();

// ── Logger ─────────────────────────────────────────────────────────
function log(level, ...msg) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [AutoFixer] [${level}]`;
  if (level === 'ERROR') console.error(prefix, ...msg);
  else console.log(prefix, ...msg);
}

// ── API Client ─────────────────────────────────────────────────────
async function apiCall(endpoint, options = {}) {
  const url = `${CONFIG.apiUrl}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${options.method || 'GET'} ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ── Error Fetcher ──────────────────────────────────────────────────
async function fetchUnresolvedErrors() {
  log('INFO', 'Fetching unresolved errors...');
  const data = await apiCall('/telemetry/errors?status=new&limit=50');
  return (data.items || []).filter(e => e.occurrence_count >= CONFIG.minOccurrences);
}

async function getErrorById(id) {
  const data = await apiCall(`/telemetry/errors?limit=1`);
  return (data.items || []).find(e => e.id === id) || null;
}

async function updateErrorStatus(id, updates) {
  return apiCall(`/telemetry/errors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

async function logFixAttempt(errorId, attempt) {
  return apiCall(`/telemetry/errors/${errorId}/fix-attempts`, {
    method: 'POST',
    body: JSON.stringify(attempt),
  });
}

// ── Source Tracer ──────────────────────────────────────────────────
/**
 * Uses code-review-graph MCP tools to trace an error to its source.
 * Falls back to grep-based search if graph tools aren't available.
 */
function traceToSource(error) {
  log('INFO', `Tracing source for: ${error.message.slice(0, 120)}`);

  // Try to identify the source from error metadata
  const clues = [];

  if (error.source_file) clues.push(error.source_file);
  if (error.api_endpoint) clues.push(`route: ${error.api_endpoint}`);
  if (error.component_stack) {
    // Extract component names from component stack
    const components = error.component_stack.match(/at\s+(\w+)\s*\(/g);
    if (components) {
      components.forEach(c => clues.push(`component: ${c.replace(/at\s+|\s*\(/g, '')}`));
    }
  }

  // Extract file paths from stack trace
  if (error.stack) {
    const fileMatches = error.stack.matchAll(/\((.+?\.(tsx?|jsx?|js)):(\d+):/g);
    for (const m of fileMatches) {
      if (!m[1].includes('node_modules') && !m[1].includes('chunk-')) {
        clues.push(`file: ${m[1].split('/').slice(-2).join('/')}`);
      }
    }
  }

  log('INFO', 'Source clues:', clues);
  return clues;
}

// ── Fix Generator (prompts the AI agent) ──────────────────────────
function generateFixPlan(error, clues) {
  const planId = `fix-${error.id?.slice(0, 8) || Date.now()}`;
  const planDir = path.join(CONFIG.fixPlanDir, planId);

  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }

  // Generate a PRD for Ralph Loop
  const prd = {
    version: '1.0',
    task: `Fix production error: ${error.error_type} - ${error.message.slice(0, 100)}`,
    context: {
      error_type: error.error_type,
      message: error.message,
      stack: error.stack,
      component_stack: error.component_stack,
      source_file: error.source_file,
      source_line: error.source_line,
      api_endpoint: error.api_endpoint,
      api_method: error.api_method,
      api_status: error.api_status,
      route: error.route,
      occurrence_count: error.occurrence_count,
      first_seen: error.first_seen_at,
      clues,
    },
    stories: [
      {
        id: 'US-001',
        title: 'Investigate and reproduce the error',
        priority: 1,
        acceptanceCriteria: [
          'Error is understood — root cause identified in source code',
          'Error can be reproduced locally if applicable',
          'Fix approach is documented in the plan',
        ],
        passes: false,
      },
      {
        id: 'US-002',
        title: 'Implement the fix',
        priority: 2,
        acceptanceCriteria: [
          'Source code fix is applied',
          'TypeScript compilation passes (npm run build in website/)',
          'No lint errors introduced',
        ],
        passes: false,
      },
      {
        id: 'US-003',
        title: 'Add regression tests',
        priority: 3,
        acceptanceCriteria: [
          'Unit test covers the fix scenario',
          'npm run test passes in website/',
          'E2E test covers the affected flow if applicable',
        ],
        passes: false,
      },
      {
        id: 'US-004',
        title: 'Verify and mark as fixed',
        priority: 4,
        acceptanceCriteria: [
          'All tests pass (unit + e2e affected flows)',
          'Build succeeds',
          'Error status updated to fix_verified',
          'Version bumped in package.json',
        ],
        passes: false,
      },
    ],
  };

  const prdPath = path.join(planDir, 'prd.json');
  fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));

  const summaryPath = path.join(planDir, 'summary.md');
  const summary = `# AutoFix Plan: ${error.error_type}

## Error
- **Type:** ${error.error_type}
- **Message:** ${error.message}
- **Occurrences:** ${error.occurrence_count}
- **First seen:** ${error.first_seen_at}
- **Last seen:** ${error.last_seen_at}

## Source Clues
${clues.map(c => `- ${c}`).join('\n')}

## Stack Trace
\`\`\`
${error.stack || 'No stack trace'}
\`\`\`

## Component Stack
\`\`\`
${error.component_stack || 'N/A'}
\`\`\`

## API Context
- **Endpoint:** ${error.api_method || 'N/A'} ${error.api_endpoint || 'N/A'}
- **Status:** ${error.api_status || 'N/A'}
- **Route:** ${error.route || 'N/A'}

## Fix Plan
See \`prd.json\` for Ralph Loop stories.
`;
  fs.writeFileSync(summaryPath, summary);

  log('INFO', `Fix plan written to: ${planDir}`);
  return { planDir, prdPath, summaryPath, planId };
}

// ── Run Tests ──────────────────────────────────────────────────────
function runTests() {
  log('INFO', 'Running unit tests...');
  try {
    execSync('cd website && npx vitest run --reporter=verbose', {
      cwd: CONFIG.projectRoot,
      stdio: 'pipe',
      timeout: 120000,
    });
    log('INFO', '✓ All unit tests pass');
    return { passed: true, output: '' };
  } catch (e) {
    const output = e.stdout?.toString() + '\n' + e.stderr?.toString();
    log('ERROR', '✗ Unit tests failed');
    return { passed: false, output: output.slice(-5000) };
  }
}

function runBuild() {
  log('INFO', 'Running build...');
  try {
    execSync('cd website && npm run build', {
      cwd: CONFIG.projectRoot,
      stdio: 'pipe',
      timeout: 120000,
    });
    log('INFO', '✓ Build succeeds');
    return { passed: true, output: '' };
  } catch (e) {
    const output = e.stdout?.toString() + '\n' + e.stderr?.toString();
    log('ERROR', '✗ Build failed');
    return { passed: false, output: output.slice(-5000) };
  }
}

// ── Ralph Loop Integration ─────────────────────────────────────────
/**
 * Invokes the Ralph Loop on a fix plan.
 * The actual implementation delegates to the AI agent via pi.
 * For now, this writes the task prompt file and signals readiness.
 */
async function invokeRalphLoop(planDir, error) {
  log('INFO', `Invoking Ralph Loop for: ${planDir}`);

  const taskPrompt = `
Fix the following production error that was caught by the AutoDebugger:

**Error Type:** ${error.error_type}
**Message:** ${error.message}
**Stack:** ${error.stack}
**Source File:** ${error.source_file}:${error.source_line}
**API:** ${error.api_method} ${error.api_endpoint}
**Route:** ${error.route}
**Occurrences:** ${error.occurrence_count}

Follow the fix plan at: ${planDir}/prd.json

Instructions:
1. Read the prd.json and summary.md in the plan directory
2. Trace the error to its root cause using code-review-graph or grep
3. Fix the source code
4. Run tests: cd website && npm run test
5. Run build: cd website && npm run build
6. Bump version in website/package.json
7. Update the error status to "fix_verified" via the API

DO NOT stop until ALL stories in prd.json have passes: true.
`;

  const taskFile = path.join(planDir, 'task.md');
  fs.writeFileSync(taskFile, taskPrompt);

  log('INFO', '========================================');
  log('INFO', 'RALPH LOOP TASK READY');
  log('INFO', `Plan directory: ${planDir}`);
  log('INFO', `Task file: ${taskFile}`);
  log('INFO', '========================================');
  log('INFO', 'Run the following to fix:');
  log('INFO', `  pi "Ralph Loop: fix production error. Read ${taskFile} and follow the plan in ${planDir}/prd.json"`);
  log('INFO', '========================================');

  return { taskFile };
}

// ── Priority Scoring ───────────────────────────────────────────────
function scoreError(error) {
  // Higher score = higher priority
  let score = error.occurrence_count * 10; // Frequency

  // Severity based on error type
  const typeWeights = {
    'React': 8,
    'API': 6,
    'Global': 10,
    'UnhandledRejection': 7,
    'Network': 5,
    'Server': 9,
    'Console': 3,
  };
  score += typeWeights[error.error_type] || 3;

  // Recency: errors in last 24h get bonus
  const lastSeen = new Date(error.last_seen_at).getTime();
  const hoursAgo = (Date.now() - lastSeen) / 3600000;
  if (hoursAgo < 1) score += 20;
  else if (hoursAgo < 24) score += 10;

  // Has source info = more actionable
  if (error.source_file) score += 5;
  if (error.api_endpoint) score += 3;
  if (error.stack) score += 2;

  return score;
}

// ── Main Fix Logic ─────────────────────────────────────────────────
async function attemptFix(error) {
  const errorId = error.id;
  log('INFO', `\n${'='.repeat(60)}`);
  log('INFO', `Starting fix attempt for error: ${errorId}`);
  log('INFO', `Type: ${error.error_type} | Occurrences: ${error.occurrence_count}`);
  log('INFO', `Message: ${error.message.slice(0, 150)}`);
  log('INFO', `${'='.repeat(60)}\n`);

  // Check previous attempts
  if (error.attempts >= CONFIG.maxAttemptsPerError) {
    log('WARN', `Max attempts (${CONFIG.maxAttemptsPerError}) reached. Marking for manual review.`);
    await updateErrorStatus(errorId, { status: 'manual_review' });
    return false;
  }

  // Mark as investigating
  await updateErrorStatus(errorId, { status: 'investigating' });
  await logFixAttempt(errorId, {
    attempt_number: (error.attempts || 0) + 1,
    action: 'analyze',
    status: 'started',
    details: 'AutoFixer initiated investigation',
  });

  // Trace source
  const clues = traceToSource(error);

  // Generate fix plan
  const { planDir } = generateFixPlan(error, clues);

  // Mark fix in progress
  await updateErrorStatus(errorId, { status: 'fix_in_progress' });

  // Invoke Ralph Loop
  await invokeRalphLoop(planDir, error);

  log('INFO', 'Fix plan ready. Ralph Loop will handle the implementation.');
  log('INFO', 'Run the pi command above to execute the fix.');

  return true;
}

// ── Daemon Mode ────────────────────────────────────────────────────
async function daemonLoop() {
  log('INFO', 'AutoFixer daemon started');
  log('INFO', `API: ${CONFIG.apiUrl}`);
  log('INFO', `Check interval: ${CONFIG.checkIntervalMs / 1000}s`);
  log('INFO', `Min occurrences: ${CONFIG.minOccurrences}`);
  log('INFO', `Max attempts per error: ${CONFIG.maxAttemptsPerError}`);

  while (true) {
    try {
      const errors = await fetchUnresolvedErrors();

      if (errors.length === 0) {
        log('INFO', 'No unresolved errors. Sleeping...');
      } else {
        log('INFO', `Found ${errors.length} unresolved errors`);
        // Sort by priority score
        const sorted = errors.sort((a, b) => scoreError(b) - scoreError(a));
        const top = sorted[0];
        log('INFO', `Top error (score: ${scoreError(top)}): ${top.message.slice(0, 100)}`);

        await attemptFix(top);
      }
    } catch (err) {
      log('ERROR', 'Daemon loop error:', err.message);
    }

    // Sleep until next check
    await new Promise(resolve => setTimeout(resolve, CONFIG.checkIntervalMs));
  }
}

// ── Entry Point ────────────────────────────────────────────────────
async function main() {
  log('INFO', 'AutoDebugger Fixer Pipeline');
  log('INFO', `Mode: ${MODE}`);

  if (MODE === 'dry-run') {
    log('INFO', 'DRY RUN — no changes will be made');
    const errors = await fetchUnresolvedErrors();
    if (errors.length === 0) {
      log('INFO', 'No unresolved errors found.');
    } else {
      const sorted = errors.sort((a, b) => scoreError(b) - scoreError(a));
      console.log('\nTop 10 errors by priority:');
      sorted.slice(0, 10).forEach((e, i) => {
        console.log(`  ${i + 1}. [${e.error_type}] (${e.occurrence_count}x) ${e.message.slice(0, 100)}`);
      });
      console.log(`\nTarget error: ${sorted[0].message}`);
      const clues = traceToSource(sorted[0]);
      console.log('Would trace to:', clues.join(', '));
    }
    return;
  }

  if (MODE === 'once' && TARGET_ERROR_ID) {
    const error = await getErrorById(TARGET_ERROR_ID);
    if (!error) {
      log('ERROR', `Error not found: ${TARGET_ERROR_ID}`);
      process.exit(1);
    }
    await attemptFix(error);
    return;
  }

  if (MODE === 'once') {
    const errors = await fetchUnresolvedErrors();
    if (errors.length === 0) {
      log('INFO', 'No unresolved errors to fix.');
      return;
    }
    const sorted = errors.sort((a, b) => scoreError(b) - scoreError(a));
    await attemptFix(sorted[0]);
    return;
  }

  if (MODE === 'daemon') {
    await daemonLoop();
    return;
  }
}

main().catch(err => {
  log('ERROR', 'Fatal:', err.message);
  console.error(err);
  process.exit(1);
});
