/**
 * Permission Registry Parity Test
 * Fails CI if permission strings used in code drift from the canonical registry.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const ROUTES_DIR = path.join(REPO_ROOT, 'api/src/routes');
const YAML_PATH = path.join(REPO_ROOT, 'product-map/contracts/permission-registry.yaml');

function extractRequirePermissionStrings(dir) {
  const strings = new Set();
  const files = fs.readdirSync(dir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fullPath.endsWith('.js')) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const regex = /requirePermission\(['"`]([^'"`]+)['"`]\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      strings.add(match[1]);
    }
  }
  return [...strings].sort();
}

function parseYamlStrings(yamlPath) {
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const strings = new Set();
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- string:')) {
      const raw = trimmed.replace('- string:', '').trim().replace(/"/g, '');
      if (raw) strings.add(raw);
    }
  }
  return [...strings].sort();
}

describe('Permission Registry Parity', () => {
  const yamlStrings = parseYamlStrings(YAML_PATH);
  const codeStrings = extractRequirePermissionStrings(ROUTES_DIR);

  it('every backend requirePermission string exists in permission-registry.yaml', () => {
    const missing = codeStrings.filter(s => !yamlStrings.includes(s));
    if (missing.length > 0) {
      throw new Error(
        `Permission strings used in routes but missing from YAML: ${missing.join(', ')}. ` +
        `Add them to product-map/contracts/permission-registry.yaml and run npm run generate:permissions.`
      );
    }
  });

  it('YAML registry has no orphaned backend strings (all are used or noted as frontend-only)', () => {
    // Some strings are frontend-only (calendar.view, commission.view, etc.) — they are in
    // frontend_route_permissions or nav_permissions sections. We only check backend_permissions here.
    const backendSection = fs.readFileSync(YAML_PATH, 'utf-8')
      .split('frontend_route_permissions:')[0];
    const backendStrings = new Set();
    const lines = backendSection.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- string:')) {
        const raw = trimmed.replace('- string:', '').trim().replace(/"/g, '');
        if (raw) backendStrings.add(raw);
      }
    }

    const unused = [...backendStrings].filter(s => !codeStrings.includes(s));
    // Allow a small set of known exceptions (e.g. routes that use dynamic permission lookup)
    const exceptions = new Set([
      'permissions.view', // used in auth middleware / resolve endpoint
      'permissions.edit', // used in auth middleware / groups endpoint
      'reports.export',   // used dynamically via exportRegistry
    ]);
    const realUnused = unused.filter(s => !exceptions.has(s));

    if (realUnused.length > 0) {
      throw new Error(
        `Backend permission strings in YAML but not found in route guards: ${realUnused.join(', ')}. ` +
        `Either use them in a route or move them to frontend-only sections.`
      );
    }
  });
});
