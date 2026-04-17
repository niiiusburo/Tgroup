#!/usr/bin/env node
/**
 * Second-pass i18n extraction: template literals, conditional expressions,
 * default params, and object literal labels inside component functions.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;

const SRC = path.resolve(__dirname, 'src');
const I18N_DIR = path.join(SRC, 'i18n/locales');

const VIETNAMESE_RE = /[\u00e1\u00e0\u1ea3\u00e3\u1ea1\u00e2\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u0103\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u00ea\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ed\u00ec\u1ec9\u0129\u1ecb\u00f3\u00f2\u1ecf\u00f5\u1ecd\u00f4\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u01a1\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00fa\u00f9\u1ee7\u0169\u1ee5\u01b0\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u00fd\u1ef3\u1ef7\u1ef9\u1ef5\u0111\u00c1\u00c0\u1ea2\u00c3\u1ea0\u00c2\u1ea4\u1ea6\u1ea8\u1eaa\u1eac\u0102\u1eae\u1eb0\u1eb2\u1eb4\u1eb6\u00c9\u00c8\u1eba\u1ebc\u1eb8\u00ca\u1ebe\u1ec0\u1ec2\u1ec4\u1ec6\u00cd\u00cc\u1ec8\u0128\u1eca\u00d3\u00d2\u1ece\u00d5\u1ecc\u00d4\u1ed0\u1ed2\u1ed4\u1ed6\u1ed8\u01a0\u1eda\u1edc\u1ede\u1ee0\u1ee2\u00da\u00d9\u1ee6\u0168\u1ee4\u01af\u1ee8\u1eea\u1eec\u1eee\u1ef0\u00dd\u1ef2\u1ef6\u1ef8\u1ef4\u0110]/;

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
  const ns = getNamespace(rel);
  const code = fs.readFileSync(filePath, 'utf-8');

  if (!VIETNAMESE_RE.test(code)) return null;

  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch (e) {
    console.error(`  Parse error in ${rel}: ${e.message}`);
    return null;
  }

  let hasChanges = false;
  let hasImport = false;
  let hasComponent = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'react-i18next') hasImport = true;
    },
    FunctionDeclaration(path) {
      if (path.node.id && /^[A-Z]/.test(path.node.id.name)) hasComponent = true;
    },
    ArrowFunctionExpression(path) {
      const parent = path.parent;
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id) && /^[A-Z]/.test(parent.id.name)) {
        hasComponent = true;
      }
    },
  });

  if (!hasComponent) return null;

  // Find all string literals with Vietnamese inside JSX contexts
  const stringLiteralsToReplace = [];

  traverse(ast, {
    // Conditional expressions inside JSX: condition ? 'vi text' : 'other'
    ConditionalExpression(path) {
      if (!path.findParent(p => t.isJSXElement(p) || t.isJSXExpressionContainer(p))) return;
      
      const processLiteral = (node, side) => {
        if (t.isStringLiteral(node) && VIETNAMESE_RE.test(node.value)) {
          stringLiteralsToReplace.push({ node, text: node.value, parentPath: path, side });
        }
      };
      processLiteral(path.node.consequent, 'consequent');
      processLiteral(path.node.alternate, 'alternate');
    },
    // Template literals with Vietnamese
    TemplateLiteral(path) {
      if (!path.findParent(p => t.isJSXElement(p) || t.isJSXExpressionContainer(p) || t.isJSXAttribute(p))) return;
      
      const quasis = path.node.quasis;
      const expressions = path.node.expressions;
      let hasVi = false;
      for (const q of quasis) {
        if (VIETNAMESE_RE.test(q.value.raw)) hasVi = true;
      }
      if (!hasVi) return;

      // For template literals, we need to convert to a concatenation of t() calls and expressions
      // This is complex - for now, we skip template literals with expressions
      // But if it's just a single quasi (no expressions), treat as string literal
      if (expressions.length === 0 && quasis.length === 1) {
        const text = quasis[0].value.raw;
        if (VIETNAMESE_RE.test(text)) {
          stringLiteralsToReplace.push({ node: path.node, text, isTemplate: true, parentPath: path });
        }
      }
    },
    // Object property values inside JSX or component functions
    ObjectProperty(path) {
      if (!t.isIdentifier(path.node.key) || path.node.key.name !== 'label') return;
      const val = path.node.value;
      if (!t.isStringLiteral(val) || !VIETNAMESE_RE.test(val.value)) return;
      
      // Only process if inside a component function (not module-level)
      const funcParent = path.findParent(p => t.isFunctionDeclaration(p) || t.isArrowFunctionExpression(p));
      if (!funcParent) return;
      
      // Check if the function is a component
      let isComponent = false;
      if (t.isFunctionDeclaration(funcParent.node) && funcParent.node.id && /^[A-Z]/.test(funcParent.node.id.name)) {
        isComponent = true;
      } else if (t.isArrowFunctionExpression(funcParent.node)) {
        const vd = funcParent.findParent(p => t.isVariableDeclarator(p));
        if (vd && t.isIdentifier(vd.node.id) && /^[A-Z]/.test(vd.node.id.name)) isComponent = true;
      }
      
      if (!isComponent) return;
      
      // Only replace if the object is inside the component (not imported)
      stringLiteralsToReplace.push({ node: val, text: val.value, parentPath: path, isObjectProperty: true });
    },
    // Array elements that are objects with label properties
    ObjectExpression(path) {
      const parent = path.parent;
      if (!t.isArrayExpression(parent) && !t.isVariableDeclarator(parent)) return;
      
      const funcParent = path.findParent(p => t.isFunctionDeclaration(p) || t.isArrowFunctionExpression(p));
      if (!funcParent) return;
      
      let isComponent = false;
      if (t.isFunctionDeclaration(funcParent.node) && funcParent.node.id && /^[A-Z]/.test(funcParent.node.id.name)) {
        isComponent = true;
      } else if (t.isArrowFunctionExpression(funcParent.node)) {
        const vd = funcParent.findParent(p => t.isVariableDeclarator(p));
        if (vd && t.isIdentifier(vd.node.id) && /^[A-Z]/.test(vd.node.id.name)) isComponent = true;
      }
      
      if (!isComponent) return;
      
      // Find all label properties in this object
      for (const prop of path.node.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === 'label' && t.isStringLiteral(prop.value) && VIETNAMESE_RE.test(prop.value.value)) {
          stringLiteralsToReplace.push({ node: prop.value, text: prop.value.value, parentPath: path.get('properties').find(p => p.node === prop), isObjectProperty: true });
        }
      }
    },
  });

  if (!stringLiteralsToReplace.length) return null;

  // Deduplicate by node reference
  const seen = new Set();
  const unique = [];
  for (const item of stringLiteralsToReplace) {
    if (!seen.has(item.node)) {
      seen.add(item.node);
      unique.push(item);
    }
  }

  for (const item of unique) {
    const key = registerKey(ns, toCamelKey(item.text), item.text);
    if (!key) continue;
    hasChanges = true;

    const tCall = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);

    if (item.isTemplate) {
      item.parentPath.replaceWith(tCall);
    } else if (item.isObjectProperty) {
      item.node.value = tCall;
    } else if (item.side === 'consequent') {
      item.parentPath.node.consequent = tCall;
    } else if (item.side === 'alternate') {
      item.parentPath.node.alternate = tCall;
    } else {
      item.parentPath.replaceWith(tCall);
    }
  }

  if (!hasChanges) return null;

  let newCode = generate(ast, { retainLines: true, retainFunctionParens: true }, code).code;

  // Add import if needed
  if (!hasImport) {
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

  // Add hook to component functions that use t but don't have it
  const hookLine = `  const { t } = useTranslation('${ns}');`;
  
  // For function declarations
  newCode = newCode.replace(
    /(function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{)(\s*\n)/,
    `$1\n${hookLine}$2`
  );
  // For arrow functions with block body
  newCode = newCode.replace(
    /(const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)(\s*\n)/,
    `$1\n${hookLine}$2`
  );
  // For function expressions assigned to const
  newCode = newCode.replace(
    /(const\s+[A-Z][A-Za-z0-9_]*\s*=\s*function\s*\([^)]*\)\s*\{)(\s*\n)/,
    `$1\n${hookLine}$2`
  );

  fs.writeFileSync(filePath, newCode, 'utf-8');
  return { rel, ns, count: unique.length };
}

const files = walk(SRC);
console.log(`Found ${files.length} JSX/TSX files for pass 2`);

const results = [];
for (const file of files) {
  const res = processFile(file);
  if (res) {
    results.push(res);
    console.log(`  + ${res.rel} (${res.count} replacements, ns: ${res.ns})`);
  }
}

console.log(`\nModified ${results.length} files`);

for (const [ns, keys] of Object.entries(keyRegistry)) {
  const viData = loadLocale(ns, 'vi');
  const enData = loadLocale(ns, 'en');
  for (const [key, viText] of Object.entries(keys)) {
    if (!(key in viData)) viData[key] = viText;
    if (!(key in enData)) enData[key] = viText;
  }
  saveLocale(ns, 'vi', viData);
  saveLocale(ns, 'en', enData);
  console.log(`  Locale ${ns}: +${Object.keys(keys).length} keys`);
}

console.log('\nPass 2 done.');
