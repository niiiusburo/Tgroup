#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const OVERLAY_PATH = path.join(__dirname, '..', 'business-overlay.json');

function loadOverlay() {
  if (!fs.existsSync(OVERLAY_PATH)) {
    console.error('ERROR: business-overlay.json not found at', OVERLAY_PATH);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(OVERLAY_PATH, 'utf8'));
}

function pad(str, width) {
  const s = String(str == null ? '' : str);
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function printTable(headers, rows) {
  const widths = headers.map((h, i) => {
    const max = rows.reduce((m, r) => Math.max(m, String(r[i] == null ? '' : r[i]).length), h.length);
    return Math.min(max, 60);
  });
  const header = headers.map((h, i) => pad(h, widths[i])).join('  ');
  const divider = widths.map(w => '-'.repeat(w)).join('  ');
  console.log(header);
  console.log(divider);
  rows.forEach(row => {
    console.log(row.map((cell, i) => pad(cell, widths[i])).join('  '));
  });
}

function cmdDomains(overlay) {
  const counts = {};
  const fileCounts = {};
  Object.values(overlay.nodes).forEach(n => {
    const d = n.domain || 'unannotated';
    counts[d] = (counts[d] || 0) + 1;
    if (n.source_file) {
      if (!fileCounts[d]) fileCounts[d] = new Set();
      fileCounts[d].add(n.source_file);
    }
  });
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, nodes]) => [domain, nodes, fileCounts[domain] ? fileCounts[domain].size : 0]);
  printTable(['DOMAIN', 'NODES', 'FILES'], rows);
}

function cmdDomain(overlay, domainId) {
  if (!domainId) { console.error('Usage: query.js domain <id>'); process.exit(1); }
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => n.domain === domainId)
    .sort((a, b) => (a[1].tier || '').localeCompare(b[1].tier || ''));
  if (matches.length === 0) { console.log('No nodes found for domain:', domainId); return; }
  console.log('Domain: ' + domainId + '  (' + matches.length + ' nodes)\n');
  printTable(
    ['TIER', 'LABEL', 'SOURCE_FILE'],
    matches.map(([, n]) => [n.tier || 'unknown', n.label || '', n.source_file || ''])
  );
}

function cmdJourney(overlay, journeyId) {
  if (!journeyId) { console.error('Usage: query.js journey <id>'); process.exit(1); }
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => Array.isArray(n.journeys) && n.journeys.includes(journeyId));
  if (matches.length === 0) { console.log('No nodes found for journey:', journeyId); return; }
  const journeyDef = (overlay.taxonomy.journeys || []).find(j => j.id === journeyId);
  if (journeyDef) {
    console.log('Journey: ' + journeyDef.label);
    console.log('Description: ' + journeyDef.description);
    console.log('Criticality: ' + journeyDef.criticality);
    console.log('\nSteps:');
    (journeyDef.steps || []).forEach((s, i) => console.log('  ' + (i + 1) + '. ' + s));
    console.log('');
  }
  console.log('Participating files (' + matches.length + '):\n');
  printTable(
    ['TIER', 'DOMAIN', 'LABEL', 'SOURCE_FILE'],
    matches
      .sort((a, b) => (a[1].tier || '').localeCompare(b[1].tier || ''))
      .map(([, n]) => [n.tier || 'unknown', n.domain || '', n.label || '', n.source_file || ''])
  );
}

function cmdEntity(overlay, entityId) {
  if (!entityId) { console.error('Usage: query.js entity <id>'); process.exit(1); }
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => Array.isArray(n.entities) && n.entities.includes(entityId));
  if (matches.length === 0) { console.log('No nodes found for entity:', entityId); return; }
  const entityDef = (overlay.taxonomy.entities || []).find(e => e.id === entityId);
  if (entityDef) {
    console.log('Entity: ' + entityDef.label + '  (source: ' + entityDef.sourceOfTruth + ')\n');
  }
  printTable(
    ['DOMAIN', 'TIER', 'LABEL', 'SOURCE_FILE'],
    matches
      .sort((a, b) => (a[1].domain || '').localeCompare(b[1].domain || ''))
      .map(([, n]) => [n.domain || '', n.tier || '', n.label || '', n.source_file || ''])
  );
}

function cmdFile(overlay, filePath) {
  if (!filePath) { console.error('Usage: query.js file <path>'); process.exit(1); }
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => n.source_file === filePath || (n.source_file || '').includes(filePath));
  if (matches.length === 0) { console.log('No nodes found for file path:', filePath); return; }
  matches.forEach(([id, n]) => {
    console.log('ID:         ' + id);
    console.log('Label:      ' + (n.label || ''));
    console.log('Source:     ' + (n.source_file || ''));
    console.log('Domain:     ' + (n.domain || ''));
    console.log('Tier:       ' + (n.tier || ''));
    console.log('Intent:     ' + (n.intent || ''));
    console.log('Entities:   ' + (n.entities || []).join(', '));
    console.log('Journeys:   ' + (n.journeys || []).join(', '));
    console.log('Exports:    ' + (n.keyExports || []).join(', '));
    console.log('Notes:      ' + (n.notes || ''));
    console.log('Community:  ' + n.community);
    console.log('');
  });
}

function cmdFlow(overlay, journeyId) {
  if (!journeyId) { console.error('Usage: query.js flow <journey-id>'); process.exit(1); }
  const journeyDef = (overlay.taxonomy.journeys || []).find(j => j.id === journeyId);
  if (!journeyDef) { console.log('Journey not found in taxonomy:', journeyId); return; }
  console.log('='.repeat(60));
  console.log('FLOW: ' + journeyDef.label);
  console.log('='.repeat(60));
  console.log(journeyDef.description + '\n');
  console.log('Criticality: ' + journeyDef.criticality + '\n');
  console.log('STEPS:');
  (journeyDef.steps || []).forEach((s, i) => {
    console.log('  ' + String(i + 1).padStart(2, '0') + '. ' + s);
  });
  console.log('');
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => Array.isArray(n.journeys) && n.journeys.includes(journeyId))
    .sort((a, b) => {
      const tierOrder = ['middleware', 'route', 'page', 'hook', 'component', 'config', 'migration', 'test', 'reference', 'unknown'];
      return tierOrder.indexOf(a[1].tier || 'unknown') - tierOrder.indexOf(b[1].tier || 'unknown');
    });
  console.log('PARTICIPATING FILES (' + matches.length + '):');
  printTable(
    ['TIER', 'DOMAIN', 'LABEL', 'SOURCE_FILE'],
    matches.map(([, n]) => [n.tier || 'unknown', n.domain || '', n.label || '', n.source_file || ''])
  );
}

function cmdUnannotated(overlay) {
  const matches = Object.entries(overlay.nodes)
    .filter(([, n]) => n.domain === 'unannotated');
  if (matches.length === 0) { console.log('All nodes are annotated.'); return; }
  console.log('Unannotated nodes (' + matches.length + '):\n');
  printTable(
    ['ID', 'LABEL', 'SOURCE_FILE'],
    matches.map(([id, n]) => [id, n.label || '', n.source_file || ''])
  );
}

function cmdStats(overlay) {
  const s = overlay.summary;
  console.log('OVERLAY COVERAGE SUMMARY');
  console.log('-'.repeat(40));
  console.log('Total nodes:        ' + s.totalNodes);
  console.log('Annotated (total):  ' + s.annotatedNodes + '  (' + (s.annotatedNodes / s.totalNodes * 100).toFixed(1) + '%)');
  if (s.annotatedExplicit != null) {
    console.log('  - explicit:       ' + s.annotatedExplicit);
    console.log('  - heuristic:      ' + s.annotatedHeuristic);
  }
  console.log('Unannotated:        ' + s.unannotatedNodes);
  console.log('Backend files:      ' + s.files.backend);
  console.log('Frontend files:     ' + s.files.frontend);
  console.log('Total files:        ' + s.files.total);
  console.log('Domains:            ' + s.domains);
  console.log('Entities:           ' + s.entities);
  console.log('Journeys:           ' + s.journeys);
  console.log('');
  const domainCounts = {};
  Object.values(overlay.nodes).forEach(n => {
    const d = n.domain || 'unannotated';
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });
  console.log('PER-DOMAIN NODE COUNTS:');
  printTable(
    ['DOMAIN', 'NODES', 'PCT'],
    Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([d, c]) => [d, c, (c / s.totalNodes * 100).toFixed(1) + '%'])
  );
  console.log('');
  const tierCounts = {};
  Object.values(overlay.nodes).forEach(n => {
    const t = n.tier || 'unknown';
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  });
  console.log('PER-TIER NODE COUNTS:');
  printTable(
    ['TIER', 'NODES'],
    Object.entries(tierCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, c])
  );
}

function cmdSearch(overlay, keyword) {
  if (!keyword) { console.error('Usage: query.js search <keyword>'); process.exit(1); }
  const kw = keyword.toLowerCase();
  const matches = Object.entries(overlay.nodes)
    .filter(([id, n]) => {
      const searchIn = [n.intent, n.notes, n.label, id, n.source_file].filter(Boolean).join(' ').toLowerCase();
      return searchIn.includes(kw);
    });
  if (matches.length === 0) { console.log('No results for keyword:', keyword); return; }
  console.log('Search results for "' + keyword + '" (' + matches.length + ' nodes):\n');
  printTable(
    ['DOMAIN', 'TIER', 'LABEL', 'INTENT'],
    matches
      .sort((a, b) => (a[1].domain || '').localeCompare(b[1].domain || ''))
      .map(([, n]) => [n.domain || '', n.tier || '', n.label || '', (n.intent || '').slice(0, 55)])
  );
}



// ─── ANSI color helpers ───────────────────────────────────────────────────────
const TTY = process.stdout.isTTY;
const C = {
  red:    s => TTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: s => TTY ? `\x1b[33m${s}\x1b[0m` : s,
  green:  s => TTY ? `\x1b[32m${s}\x1b[0m` : s,
  bold:   s => TTY ? `\x1b[1m${s}\x1b[0m`  : s,
  cyan:   s => TTY ? `\x1b[36m${s}\x1b[0m` : s,
};

function colorStatus(status) {
  if (status === 'fully-enforced' || status === 'db-and-api') return C.green(status);
  if (status === 'unenforced') return C.red(status);
  return C.yellow(status);
}

function colorSeverity(severity) {
  if (severity === 'critical') return C.red(severity);
  if (severity === 'high')     return C.yellow(severity);
  return severity;
}

// ─── Invariants data loader ───────────────────────────────────────────────────
const INVARIANTS_PATH = path.join(__dirname, '..', 'business-invariants.json');

function loadInvariants() {
  if (!fs.existsSync(INVARIANTS_PATH)) {
    console.error('ERROR: business-invariants.json not found at', INVARIANTS_PATH);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INVARIANTS_PATH, 'utf8'));
}

// ─── Invariant commands ───────────────────────────────────────────────────────

function cmdInvariants() {
  const data = loadInvariants();
  const s = data.summary;
  console.log(C.bold('BUSINESS INVARIANTS — ENFORCEMENT SUMMARY'));
  console.log('-'.repeat(60));
  console.log('Total invariants:    ' + s.totalInvariants);
  console.log('Fully enforced:      ' + C.green(s.fullyEnforced));
  console.log('Partially enforced:  ' + C.yellow(s.partiallyEnforced));
  console.log('Unenforced:          ' + C.red(s.unenforced));
  console.log('Critical gaps:       ' + C.red(s.critical_gaps));
  console.log('');
  printTable(
    ['ID', 'ENTITY', 'SEVERITY', 'STATUS'],
    data.invariants.map(i => [i.id, i.entity, colorSeverity(i.severity), colorStatus(i.status)])
  );
}

function cmdInvariant(id) {
  if (!id) { console.error('Usage: query.js invariant <id>'); process.exit(1); }
  const data = loadInvariants();
  const inv = data.invariants.find(i => i.id === id);
  if (!inv) {
    console.error('Invariant not found:', id);
    console.error('Use "invariants" command to list all IDs');
    process.exit(1);
  }
  console.log(C.bold('INVARIANT: ' + inv.id));
  console.log('Entity:     ' + inv.entity);
  console.log('Kind:       ' + inv.kind);
  console.log('Severity:   ' + colorSeverity(inv.severity));
  console.log('Status:     ' + colorStatus(inv.status));
  console.log('Rule:       ' + inv.rule);
  console.log('Rationale:  ' + inv.rationale);
  console.log('');
  console.log('ENFORCEMENT:');
  ['db', 'api', 'ui'].forEach(layer => {
    const e = inv.enforcement[layer];
    const label = layer.toUpperCase().padEnd(4);
    if (e.status === 'enforced') {
      console.log('  ' + C.green(label + ' enforced'));
      e.references.forEach(r => console.log('    ' + r.id + '  ' + r.file + ':' + r.line));
    } else {
      console.log('  ' + C.red(label + ' missing'));
    }
  });
  console.log('');
  console.log('RECOMMENDATION:');
  console.log('  ' + inv.recommendation);
}

function cmdEntityRules(entity) {
  if (!entity) { console.error('Usage: query.js entity-rules <entity>'); process.exit(1); }
  const data = loadInvariants();
  const matches = data.invariants.filter(i => i.entity === entity);
  if (matches.length === 0) {
    console.log('No invariants for entity:', entity);
    console.log('Available entities:', [...new Set(data.invariants.map(i => i.entity))].join(', '));
    return;
  }
  console.log(C.bold('INVARIANTS FOR ENTITY: ' + entity + '  (' + matches.length + ' rules)'));
  console.log('');
  printTable(
    ['ID', 'KIND', 'SEVERITY', 'STATUS'],
    matches.map(i => [i.id, i.kind, colorSeverity(i.severity), colorStatus(i.status)])
  );
}

function cmdGaps() {
  const data = loadInvariants();
  const gaps = data.invariants
    .filter(i => i.status === 'unenforced' || i.status === 'ui-only')
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
    });
  if (gaps.length === 0) { console.log(C.green('No enforcement gaps found.')); return; }
  console.log(C.bold('ENFORCEMENT GAPS (' + gaps.length + ' rules — unenforced or ui-only)'));
  console.log('');
  gaps.forEach(i => {
    const tag = i.status === 'unenforced' ? '[UNENFORCED]' : '[UI-ONLY]   ';
    console.log(tag + ' ' + i.id);
    console.log('         severity: ' + i.severity + '  entity: ' + i.entity + '  kind: ' + i.kind);
    console.log('         rule: ' + i.rule.slice(0, 90));
    console.log('         fix: ' + i.recommendation.slice(0, 100));
    console.log('');
  });
}

function cmdEnforcement(layer) {
  if (!layer || !['db','api','ui'].includes(layer)) {
    console.error('Usage: query.js enforcement <db|api|ui>');
    process.exit(1);
  }
  const data = loadInvariants();
  const enforced = data.invariants.filter(i => i.enforcement[layer].status === 'enforced');
  const missing  = data.invariants.filter(i => i.enforcement[layer].status === 'missing');
  console.log(C.bold('ENFORCEMENT LAYER: ' + layer.toUpperCase()));
  console.log('Enforced (' + enforced.length + '):');
  enforced.forEach(i => {
    const refs = i.enforcement[layer].references.map(r => r.id).join(', ');
    console.log('  + ' + i.id + '  [' + refs + ']');
  });
  console.log('');
  console.log('Missing (' + missing.length + '):');
  missing.forEach(i => {
    console.log('  - ' + i.id + '  (' + i.severity + ')');
  });
}

const FLOWS_PATH = path.join(__dirname, 'flows.json');

function loadFlows() {
  if (!fs.existsSync(FLOWS_PATH)) {
    console.error('ERROR: flows.json not found at', FLOWS_PATH);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8'));
}

function cmdFlowDetail(journeyId) {
  if (!journeyId) { console.error('Usage: query.js flow-detail <journey-id>'); process.exit(1); }
  const flows = loadFlows();
  const flow = flows.flows[journeyId];
  if (!flow) {
    console.log('Flow not found in flows.json:', journeyId);
    console.log('Available journeys:', Object.keys(flows.flows).join(', '));
    return;
  }
  console.log('='.repeat(60));
  console.log('FLOW: ' + flow.label);
  console.log('='.repeat(60));
  console.log('Journey:     ' + flow.journey);
  console.log('Criticality: ' + flow.criticality);
  console.log('Entry point: ' + flow.entryPoint);
  console.log('Boundary:    ' + (flow.crossesBoundary ? 'frontend + backend' : 'single-layer'));
  console.log('');
  console.log('STEPS (' + flow.steps.length + '):');
  (flow.steps || []).forEach((s) => {
    const num = String(s.order).padStart(2, '0');
    const loc = s.file + ':' + s.line;
    console.log('  ' + num + '. [' + s.kind + '] ' + loc + ' \u2014 ' + s.label);
  });
  console.log('');
  console.log('FILES INVOLVED (' + (flow.filesInvolved || []).length + '):');
  (flow.filesInvolved || []).forEach((f) => console.log('  ' + f));
}

function printHelp() {
  console.log('Usage: node graphify-out/overlay/query.js <command> [args]');
  console.log('');
  console.log('Commands:');
  console.log('  domains              List all domains with node counts');
  console.log('  domain <id>          List all nodes in a domain');
  console.log('  journey <id>         List nodes in a journey (with steps)');
  console.log('  entity <id>          List nodes touching an entity');
  console.log('  file <path>          Show annotation for a specific file');
  console.log('  flow <journey-id>         Pretty-print journey steps + participating files (from overlay)');
  console.log('  flow-detail <journey-id>  Pretty-print ordered code-level flow steps with file:line (from flows.json)');
  console.log('  unannotated          List files with no annotation');
  console.log('  stats                Coverage summary: annotated/total, per-domain, per-tier');
  console.log('  search <keyword>     Search intents + notes + labels for a keyword');
  console.log('');
  console.log('Invariant commands:');
  console.log('  invariants           List all 43 invariants with enforcement status');
  console.log('  invariant <id>       Show full details for one invariant');
  console.log('  entity-rules <e>     List invariants for a specific entity');
  console.log('  gaps                 List unenforced or ui-only rules (critical first)');
  console.log('  enforcement <layer>  List rules enforced at db / api / ui');
  console.log('');
  console.log('Examples:');
  console.log('  node graphify-out/overlay/query.js domains');
  console.log('  node graphify-out/overlay/query.js domain payments');
  console.log('  node graphify-out/overlay/query.js journey payment-create');
  console.log('  node graphify-out/overlay/query.js flow login');
  console.log('  node graphify-out/overlay/query.js flow-detail login');
  console.log('  node graphify-out/overlay/query.js flow-detail payment-create');
  console.log('  node graphify-out/overlay/query.js search void');
  console.log('  node graphify-out/overlay/query.js stats');
}

const [,, cmd, ...args] = process.argv;
if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { printHelp(); process.exit(0); }
const overlay = loadOverlay();
switch (cmd) {
  case 'domains':     cmdDomains(overlay); break;
  case 'domain':      cmdDomain(overlay, args[0]); break;
  case 'journey':     cmdJourney(overlay, args[0]); break;
  case 'entity':      cmdEntity(overlay, args[0]); break;
  case 'file':        cmdFile(overlay, args[0]); break;
  case 'flow':        cmdFlow(overlay, args[0]); break;
  case 'flow-detail': cmdFlowDetail(args[0]); break;
  case 'unannotated': cmdUnannotated(overlay); break;
  case 'stats':       cmdStats(overlay); break;
  case 'search':      cmdSearch(overlay, args[0]); break;
  case 'invariants':  cmdInvariants(); break;
  case 'invariant':   cmdInvariant(args[0]); break;
  case 'entity-rules':cmdEntityRules(args[0]); break;
  case 'gaps':        cmdGaps(); break;
  case 'enforcement': cmdEnforcement(args[0]); break;
  default:
    console.error('Unknown command:', cmd);
    printHelp();
    process.exit(1);
}
