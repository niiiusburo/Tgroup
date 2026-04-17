#!/usr/bin/env node
/**
 * AST-based i18n extraction script for React/TSX files.
 * Uses Babel to safely transform JSX text and attributes.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;

const SRC = path.resolve(__dirname, 'src');
const I18N_DIR = path.join(SRC, 'i18n/locales');

// Regex to detect Vietnamese characters
const VIETNAMESE_RE = /[\u00e1\u00e0\u1ea3\u00e3\u1ea1\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u0103\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ed\u00ec\u1ec9\u0129\u1ecb\u00f3\u00f2\u1ecf\u00f5\u1ecd\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00fa\u00f9\u1ee7\u0169\u1ee5\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u00fd\u1ef3\u1ef7\u1ef9\u1ef5\u0111\u00c1\u00c0\u1ea2\u00c3\u1ea0\u00c2\u1ea4\u1ea6\u1ea8\u1eaa\u1eac\u0102\u1eae\u1eb0\u1eb2\u1eb4\u1eb6\u00c9\u00c8\u1eba\u1ebc\u1eb8\u00ca\u1ebe\u1ec0\u1ec2\u1ec4\u1ec6\u00cd\u00cc\u1ec8\u0128\u1eca\u00d3\u00d2\u1ece\u00d5\u1ecc\u00d4\u1ed0\u1ed2\u1ed4\u1ed6\u1ed8\u01a0\u1eda\u1edc\u1ede\u1ee0\u1ee2\u00da\u00d9\u1ee6\u0168\u1ee4\u01af\u1ee8\u1eea\u1eec\u1eee\u1ef0\u00dd\u1ef2\u1ef6\u1ef8\u1ef4\u0110]/;

const SKIP_FILES = [
  'data/serviceCatalog.ts',
  'i18n/index.ts',
  'types/customer.ts',
  'types/employee.ts',
  'types/settings.ts',
];

function getNamespace(relPath) {
  if (/pages\/Calendar/.test(relPath) || /components\/calendar\//.test(relPath)) return 'calendar';
  if (/pages\/Customers/.test(relPath) || /components\/customer\//.test(relPath) || /components\/forms\/AddCustomerForm\//.test(relPath)) return 'customers';
  if (/pages\/Appointments/.test(relPath) || /components\/appointments\//.test(relPath)) return 'appointments';
  if (/pages\/Employees/.test(relPath) || /components\/employees\//.test(relPath)) return 'employees';
  if (/pages\/Payment/.test(relPath) || /components\/payment\//.test(relPath)) return 'payment';
  if (/pages\/Settings/.test(relPath) || /components\/settings\//.test(relPath)) return 'settings';
  if (/pages\/ServiceCatalog/.test(relPath) || /pages\/Services/.test(relPath) || /components\/services\//.test(relPath)) return 'services';
  if (/pages\/reports/.test(relPath) || /components\/reports\//.test(relPath)) return 'reports';
  if (/components\/website\//.test(relPath) || /pages\/Website/.test(relPath)) return 'website';
  if (/pages\/Overview/.test(relPath)) return 'overview';
  if (/pages\/Login/.test(relPath) || /contexts\/AuthContext/.test(relPath)) return 'auth';
  if (/pages\/Locations/.test(relPath) || /components\/locations\//.test(relPath)) return 'locations';
  if (/pages\/Relationships/.test(relPath)) return 'relationships';
  if (/pages\/PermissionBoard/.test(relPath) || /components\/relationships\//.test(relPath)) return 'permissions';
  if (/pages\/Feedback/.test(relPath)) return 'feedback';
  if (/pages\/Commission/.test(relPath)) return 'commission';
  if (/pages\/Notifications/.test(relPath)) return 'notifications';
  if (/components\/modules\//.test(relPath)) return 'common';
  if (/components\/shared\//.test(relPath) || /components\/ui\//.test(relPath) || /components\/Layout/.test(relPath)) return 'common';
  return 'common';
}

function toCamelKey(text) {
  text = text.trim().replace(/[^\w\s]/g, '');
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  let result = words[0].toLowerCase();
  for (let i = 1; i < words.length; i++) {
    result += words[i][0].toUpperCase() + words[i].slice(1).toLowerCase();
  }
  return result.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
}

function loadLocale(ns, lang) {
  const p = path.join(I18N_DIR, lang, `${ns}.json`);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return {};
}

function saveLocale(ns, lang, data) {
  const p = path.join(I18N_DIR, lang, `${ns}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// Global key registry
const keyRegistry = {};

function registerKey(ns, key, viText) {
  if (!keyRegistry[ns]) keyRegistry[ns] = {};
  let finalKey = key;
  let counter = 1;
  while (keyRegistry[ns][finalKey] !== undefined && keyRegistry[ns][finalKey] !== viText) {
    finalKey = `${key}${counter}`;
    counter++;
  }
  keyRegistry[ns][finalKey] = viText;
  return finalKey;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.vite' || entry.name === '__tests__') continue;
      walk(full, out);
    } else if (/\.(tsx|jsx)$/.test(entry.name) && !/(\.(test|spec)\.|mock)/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function processFile(filePath) {
  const rel = path.relative(SRC, filePath);
  if (SKIP_FILES.some(s => rel.endsWith(s) || rel.includes(s))) return null;

  const ns = getNamespace(rel);
  const code = fs.readFileSync(filePath, 'utf-8');

  // Quick check: does it contain Vietnamese?
  if (!VIETNAMESE_RE.test(code)) return null;

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (e) {
    console.error(`  Parse error in ${rel}: ${e.message}`);
    return null;
  }

  let hasChanges = false;
  let needsImport = false;
  let needsHook = false;

  // Collect all JSX text and attribute string literals with Vietnamese
  const replacements = [];

  traverse(ast, {
    JSXText(path) {
      const text = path.node.value;
      if (!VIETNAMESE_RE.test(text)) return;
      // Skip whitespace-only
      const trimmed = text.trim();
      if (!trimmed) return;
      // Skip if parent is a style or script tag
      const parent = path.parent;
      if (t.isJSXElement(parent) && t.isJSXIdentifier(parent.openingElement.name)) {
        const tagName = parent.openingElement.name.name;
        if (tagName === 'style' || tagName === 'script') return;
      }
      replacements.push({ type: 'text', node: path.node, text: trimmed, raw: text });
    },
    JSXAttribute(path) {
      const attrName = t.isJSXIdentifier(path.node.name) ? path.node.name.name : '';
      if (!['label', 'placeholder', 'title', 'aria-label', 'description', 'alt'].includes(attrName)) return;
      const val = path.node.value;
      if (!t.isStringLiteral(val)) return;
      if (!VIETNAMESE_RE.test(val.value)) return;
      replacements.push({ type: 'attr', node: path.node, text: val.value, attrName });
    },
  });

  if (!replacements.length) return null;

  // We need to check if the file is a React component (has function that returns JSX)
  let hasComponent = false;
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id && /^[A-Z]/.test(path.node.id.name)) hasComponent = true;
    },
    ArrowFunctionExpression(path) {
      // Check if parent is a variable declarator with capitalized name
      const parent = path.parent;
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id) && /^[A-Z]/.test(parent.id.name)) {
        hasComponent = true;
      }
    },
  });

  if (!hasComponent) {
    console.log(`  SKIP ${rel} (not a React component)`);
    return null;
  }

  // Check if useTranslation is already imported
  let hasImport = false;
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'react-i18next') hasImport = true;
    },
  });

  // Now do the replacements
  for (const rep of replacements) {
    const key = registerKey(ns, toCamelKey(rep.text), rep.text);
    if (!key) continue;
    hasChanges = true;

    if (rep.type === 'text') {
      // Replace JSXText with JSXExpressionContainer containing t('key')
      const expr = t.jsxExpressionContainer(
        t.callExpression(
          t.identifier('t'),
          [t.stringLiteral(key)]
        )
      );
      rep.node.value = '';
      // We can't easily replace JSXText in place; instead we'll post-process with regex
      // Actually, let's use a different approach: mark for regex replacement
      rep.replacement = `{t('${key}')}`;
    } else if (rep.type === 'attr') {
      // Replace StringLiteral with JSXExpressionContainer
      rep.node.value = t.jsxExpressionContainer(
        t.callExpression(
          t.identifier('t'),
          [t.stringLiteral(key)]
        )
      );
    }
  }

  if (!hasChanges) return null;

  // Generate new code
  let newCode = generate(ast, { retainLines: true, retainFunctionParens: true }, code).code;

  // Fix JSXText replacements (Babel generator doesn't handle JSXText -> JSXExpression well)
  for (const rep of replacements) {
    if (rep.type === 'text' && rep.replacement) {
      // Find the original text and replace it
      // The text might have been modified by Babel, so we need to be careful
      const escaped = rep.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(>)\\s*${escaped}\\s*(<)`, 'g');
      newCode = newCode.replace(pattern, `$1${rep.replacement}$2`);
    }
  }

  // Add useTranslation import if needed
  if (!hasImport && hasChanges) {
    const importLine = `import { useTranslation } from 'react-i18next';`;
    const lines = newCode.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    newCode = lines.join('\n');
  }

  // Add const { t } = useTranslation(ns) inside component functions
  // We'll do this by finding function bodies that don't already have it
  if (!hasImport && hasChanges) {
    // Need to add hook call
    // Find first function body and add after first line
    const hookLine = `  const { t } = useTranslation('${ns}');`;
    // Simple regex approach: add after opening brace of component function
    newCode = newCode.replace(
      /(function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{)(\s*\n)/,
      `$1\n${hookLine}$2`
    );
    newCode = newCode.replace(
      /(const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)(\s*\n)/,
      `$1\n${hookLine}$2`
    );
  } else if (hasChanges) {
    // Already has import - check if it already has useTranslation call with this namespace
    if (!newCode.includes(`useTranslation('${ns}')`) && !newCode.includes(`useTranslation("${ns}")`)) {
      const hookLine = `  const { t } = useTranslation('${ns}');`;
      // Check if there's already a useTranslation call
      if (!/useTranslation\s*\(/.test(newCode)) {
        newCode = newCode.replace(
          /(function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{)(\s*\n)/,
          `$1\n${hookLine}$2`
        );
        newCode = newCode.replace(
          /(const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)(\s*\n)/,
          `$1\n${hookLine}$2`
        );
      }
    }
  }

  fs.writeFileSync(filePath, newCode, 'utf-8');
  return { rel, ns, count: replacements.length };
}

// Main
const files = walk(SRC);
console.log(`Found ${files.length} JSX/TSX files to scan`);

const results = [];
for (const file of files) {
  const res = processFile(file);
  if (res) {
    results.push(res);
    console.log(`  + ${res.rel} (${res.count} replacements, ns: ${res.ns})`);
  }
}

console.log(`\nModified ${results.length} files`);

// Save locale files
for (const [ns, keys] of Object.entries(keyRegistry)) {
  const viData = loadLocale(ns, 'vi');
  const enData = loadLocale(ns, 'en');
  for (const [key, viText] of Object.entries(keys)) {
    if (!(key in viData)) viData[key] = viText;
    if (!(key in enData)) enData[key] = viText; // fallback
  }
  saveLocale(ns, 'vi', viData);
  saveLocale(ns, 'en', enData);
  console.log(`  Locale ${ns}: +${Object.keys(keys).length} keys`);
}

console.log('\nDone.');
