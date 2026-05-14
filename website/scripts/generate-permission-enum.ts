#!/usr/bin/env node
/**
 * Permission Registry Generator
 * Reads product-map/contracts/permission-registry.yaml and emits:
 *   - website/src/types/generated/permissions.ts
 *   - api/src/constants/permissions.js
 *
 * Run: npx tsx scripts/generate-permission-enum.ts
 * Or:  node scripts/generate-permission-enum.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const YAML_PATH = path.join(REPO_ROOT, 'product-map/contracts/permission-registry.yaml');
const TS_OUT = path.join(REPO_ROOT, 'website/src/types/generated/permissions.ts');
const JS_OUT = path.join(REPO_ROOT, 'api/src/constants/permissions.js');

interface PermissionEntry {
  string: string;
  category: string;
  action: string;
}

function parseYamlStrings(content: string): PermissionEntry[] {
  const lines = content.split('\n');
  const entries: PermissionEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- string:')) {
      const raw = trimmed.replace('- string:', '').trim().replace(/"/g, '');
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      const [category, action] = raw.split('.');
      entries.push({ string: raw, category, action });
    }
  }

  // Sort for deterministic output
  return entries.sort((a, b) => a.string.localeCompare(b.string));
}

function groupByCategory(entries: PermissionEntry[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const e of entries) {
    if (!groups[e.category]) groups[e.category] = [];
    groups[e.category].push(e.string);
  }
  return groups;
}

function generateTs(entries: PermissionEntry[]): string {
  const groups = groupByCategory(entries);
  const allStrings = entries.map(e => `  | '${e.string}'`).join('\n');

  let categoryUnions = '';
  for (const [cat, strings] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    const union = strings.map(s => `  | '${s}'`).join('\n');
    categoryUnions += `\nexport type ${toPascal(cat)} =\n${union};\n`;
  }

  return `// AUTO-GENERATED from product-map/contracts/permission-registry.yaml
// Do not edit manually. Run: npm run generate:permissions

export type PermissionString =
${allStrings};

export const ALL_PERMISSIONS: readonly PermissionString[] = [
${entries.map(e => `  '${e.string}',`).join('\n')}
];

export const PERMISSION_CATEGORIES = [
${Object.keys(groups).map(c => `  '${c}',`).join('\n')}
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];
${categoryUnions}
export const PERMISSION_BY_CATEGORY: Record<PermissionCategory, readonly PermissionString[]> = {
${Object.entries(groups)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([cat, strings]) => `  '${cat}': [\n${strings.map(s => `    '${s}',`).join('\n')}\n  ],`)
  .join('\n')}
};
`;
}

function generateJs(entries: PermissionEntry[]): string {
  return `// AUTO-GENERATED from product-map/contracts/permission-registry.yaml
// Do not edit manually. Run: npm run generate:permissions

module.exports.ALL_PERMISSIONS = [
${entries.map(e => `  '${e.string}',`).join('\n')}
];

module.exports.PERMISSION_CATEGORIES = [
${Object.keys(groupByCategory(entries))
  .sort((a, b) => a.localeCompare(b))
  .map(c => `  '${c}',`).join('\n')}
];
`;
}

function toPascal(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase()) + 'Permission';
}

function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error(`Registry not found: ${YAML_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(YAML_PATH, 'utf-8');
  const entries = parseYamlStrings(content);

  if (entries.length === 0) {
    console.error('No permission strings found in YAML');
    process.exit(1);
  }

  // Ensure output directories exist
  fs.mkdirSync(path.dirname(TS_OUT), { recursive: true });
  fs.mkdirSync(path.dirname(JS_OUT), { recursive: true });

  fs.writeFileSync(TS_OUT, generateTs(entries), 'utf-8');
  fs.writeFileSync(JS_OUT, generateJs(entries), 'utf-8');

  console.log(`✅ Generated ${entries.length} permissions`);
  console.log(`   TS: ${path.relative(REPO_ROOT, TS_OUT)}`);
  console.log(`   JS: ${path.relative(REPO_ROOT, JS_OUT)}`);
}

main();
