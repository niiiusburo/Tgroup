const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const srcDir = path.join(__dirname, '../src');

const namespaces = {};
for (const lang of ['en', 'vi']) {
  namespaces[lang] = {};
  const dir = path.join(localesDir, lang);
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.json')) {
      const ns = file.replace('.json', '');
      namespaces[lang][ns] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    }
  }
}

function getValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let val = obj;
  for (const p of parts) {
    if (val && typeof val === 'object') val = val[p];
    else return undefined;
  }
  return val;
}

function findTsxFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      findTsxFiles(full, files);
    } else if (
      entry.isFile() &&
      /\.(tsx|ts)$/.test(entry.name) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      files.push(full);
    }
  }
  return files;
}

const files = findTsxFiles(srcDir);
const missing = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find useTranslation namespace(s)
  const nsMatch = content.match(/useTranslation\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  const defaultNs = nsMatch ? nsMatch[1] : 'common';

  // Find t('...') calls, possibly with ns override
  const tCalls = [...content.matchAll(/(?<![\w$])t\s*\(\s*['"`]([^'"`]+)['"`]([^)]*)\)/g)];

  for (const [, rawKey, options] of tCalls) {
    let key = rawKey;
    let overrideNs = options.match(/ns\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
    if (key.includes('${') || key.includes('+') || key.startsWith('.')) continue;
    if (!key.trim() || /^[\s,./\\-]+$/.test(key)) continue;
    if (key.includes(':')) {
      const [prefix, ...rest] = key.split(':');
      if (namespaces.en[prefix] || namespaces.vi[prefix]) {
        overrideNs = prefix;
        key = rest.join(':');
      }
    }

    const ns = overrideNs || defaultNs;
    const enVal = getValue(namespaces.en[ns], key);
    const viVal = getValue(namespaces.vi[ns], key);

    if (enVal === undefined || viVal === undefined) {
      missing.push({ file: path.relative(srcDir, file), ns, key, en: enVal !== undefined, vi: viVal !== undefined });
    }
  }
}

// Group by file
const byFile = {};
for (const m of missing) {
  byFile[m.file] = byFile[m.file] || [];
  byFile[m.file].push(m);
}

console.log(`Found ${missing.length} missing translation keys:\n`);
for (const [file, keys] of Object.entries(byFile).sort()) {
  console.log(`\n${file}:`);
  for (const k of keys) {
    const missingLangs = [];
    if (!k.en) missingLangs.push('en');
    if (!k.vi) missingLangs.push('vi');
    console.log(`  [${k.ns}] "${k.key}" → missing: ${missingLangs.join(', ')}`);
  }
}
