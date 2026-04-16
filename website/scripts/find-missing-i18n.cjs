#!/usr/bin/env node
/**
 * Scan the website src/ for i18n keys used in t() calls
 * and report which ones are missing from locale JSON files.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');
const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');
const LANGUAGES = ['vi', 'en'];

// ─── Helpers ──────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function extractNamespaces(code) {
  // Matches: useTranslation('appointments') or useTranslation(["a","b"])
  const nsSet = new Set();
  const single = /useTranslation\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g;
  let m;
  while ((m = single.exec(code))) nsSet.add(m[1]);
  const array = /useTranslation\s*\(\s*\[\s*([^\]]+)\s*\]/g;
  while ((m = array.exec(code))) {
    m[1].match(/['"`]([a-zA-Z0-9_-]+)['"`]/g)?.forEach((s) => {
      nsSet.add(s.replace(/['"`]/g, ''));
    });
  }
  return Array.from(nsSet);
}

function extractTCalls(code) {
  // Very naive regex to capture t('key', ...) or t("key", ...)
  const calls = [];
  const regex = /t\s*\(\s*(['"`])((?:\\\1|[^\1])*?)\1/g;
  let m;
  while ((m = regex.exec(code))) {
    calls.push(m[2]);
  }
  return calls;
}

function extractNsOption(code, keyLiteral) {
  // Look for t('key', { ns: 'namespace' }) right after the key literal
  // We search a small window after the key occurrence.
  const idx = code.indexOf(keyLiteral);
  if (idx === -1) return null;
  const window = code.slice(idx, idx + 200);
  const nsMatch = window.match(/ns\s*:\s*['"`]([a-zA-Z0-9_-]+)['"`]/);
  return nsMatch ? nsMatch[1] : null;
}

function loadTranslations(lang) {
  const dir = path.join(LOCALES_DIR, lang);
  const map = new Map(); // ns -> object
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const ns = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    map.set(ns, flatten(content));
  }
  return map;
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function getValue(flat, key) {
  return flat[key];
}

// ─── Main ─────────────────────────────────────────────────────────
const files = walk(SRC_DIR);
const langsData = {};
for (const lang of LANGUAGES) {
  langsData[lang] = loadTranslations(lang);
}

const missing = []; // { file, key, namespaces[], langsMissing[] }

for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  const defaultNs = extractNamespaces(code);
  const keys = extractTCalls(code);

  for (const key of keys) {
    // Determine namespace(s) to check
    const explicitNs = extractNsOption(code, key);
    const nss = explicitNs ? [explicitNs] : defaultNs.length ? defaultNs : ['translation'];

    for (const lang of LANGUAGES) {
      const data = langsData[lang];
      let found = false;
      for (const ns of nss) {
        const flat = data.get(ns);
        if (flat && flat[key] !== undefined) {
          found = true;
          break;
        }
      }
      if (!found) {
        missing.push({ file: path.relative(SRC_DIR, file), key, namespaces: nss, lang });
      }
    }
  }
}

// Deduplicate by (file, key, namespaces)
const grouped = {};
for (const item of missing) {
  const id = `${item.file}::${item.key}::${item.namespaces.join(',')}`;
  if (!grouped[id]) grouped[id] = { ...item, langs: [] };
  if (!grouped[id].langs.includes(item.lang)) grouped[id].langs.push(item.lang);
}

const results = Object.values(grouped).sort((a, b) => a.file.localeCompare(b.file));

console.log(`Found ${results.length} potentially missing keys\n`);
for (const r of results) {
  console.log(`${r.file}`);
  console.log(`  key: "${r.key}"  namespaces: [${r.namespaces.join(', ')}]  missing in: [${r.langs.join(', ')}]`);
}
