'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * FEATURE CATALOG CROSS-CHECK — Validate YAML specs against actual builder code.
 *
 * The feature catalog (product-map/features/exports/*.yaml) is the single source
 * of truth for export specifications: columns, API routes, permissions, and entry
 * points. This test ensures the YAML doesn't drift from the actual implementation.
 *
 * For each YAML file:
 *   1. Load the YAML and extract columns definition
 *   2. Require the corresponding builder module (exportRegistry, builder files)
 *   3. Assert YAML column count matches code column count
 *   4. Assert YAML column keys and headers match code in order
 *
 * If you intentionally change a column in a builder:
 *   1. Update the YAML file to match
 *   2. Run this test
 *   3. Commit both the builder and the YAML together
 *
 * Snapshots verified against working tree at commit 1f46c549 (2026-05-20).
 */

const CATALOG_DIR = path.resolve(__dirname, '..', '..', '..', '..', '..', 'product-map', 'features', 'exports');
const BUILDERS_DIR = path.resolve(__dirname, '..', 'builders');

function loadYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

function getBuilderColumns(builderPath, arrayConstName = 'COLUMNS') {
  const src = fs.readFileSync(builderPath, 'utf8');
  const re = new RegExp(`const ${arrayConstName}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const match = src.match(re);
  if (!match) {
    throw new Error(`Could not find "const ${arrayConstName}" in ${builderPath}`);
  }
  const body = match[1];
  const columns = [];
  const keyMatches = [...body.matchAll(/\{\s*key\s*:\s*['"]([^'"]+)['"]\s*,\s*header\s*:\s*['"]([^'"]+)['"]/g)];
  keyMatches.forEach((m) => {
    columns.push({ key: m[1], header: m[2] });
  });
  return columns;
}

describe('Feature Catalog — YAML cross-check against builders', () => {
  // Test matrix: feature_id → { yamlFile, builderFile, arrayConstName }
  const specs = [
    {
      feature_id: 'appointments-export',
      yamlFile: 'appointments-export.yaml',
      builderFile: 'appointmentsExport.js',
      arrayConstName: 'COLUMNS',
    },
    {
      feature_id: 'customers-export',
      yamlFile: 'customers-export.yaml',
      builderFile: 'customersExport.js',
      arrayConstName: 'COLUMNS',
    },
    {
      feature_id: 'payments-export',
      yamlFile: 'payments-export.yaml',
      builderFile: 'paymentsExport.js',
      arrayConstName: 'COLUMNS',
    },
    {
      feature_id: 'services-export',
      yamlFile: 'services-export.yaml',
      builderFile: 'servicesExport.js',
      arrayConstName: 'COLUMNS',
    },
    {
      feature_id: 'service-catalog-export',
      yamlFile: 'service-catalog-export.yaml',
      builderFile: 'serviceCatalogExport.js',
      arrayConstName: 'COLUMNS',
    },
    {
      feature_id: 'report-sales-employees-export',
      yamlFile: 'report-sales-employees-export.yaml',
      builderFile: 'reportSalesEmployeesExport.js',
      arrayConstName: 'DATA_COLUMNS',
    },
    {
      feature_id: 'revenue-flat-export',
      yamlFile: 'revenue-flat-export.yaml',
      builderFile: 'legacyFlatReportColumns.js',
      arrayConstName: 'REVENUE_COLUMNS',
    },
    {
      feature_id: 'deposit-flat-export',
      yamlFile: 'deposit-flat-export.yaml',
      builderFile: 'legacyFlatReportColumns.js',
      arrayConstName: 'DEPOSIT_COLUMNS',
    },
  ];

  specs.forEach(({ feature_id, yamlFile, builderFile, arrayConstName }) => {
    describe(`${feature_id}`, () => {
      let yamlData;
      let codeColumns;

      beforeAll(() => {
        const yamlPath = path.join(CATALOG_DIR, yamlFile);
        const builderPath = path.join(BUILDERS_DIR, builderFile);

        // Verify both files exist
        expect(fs.existsSync(yamlPath)).toBe(true);
        expect(fs.existsSync(builderPath)).toBe(true);

        // Load YAML and extract columns
        yamlData = loadYaml(yamlPath);
        expect(yamlData).toBeDefined();
        expect(yamlData.columns).toBeDefined();

        // Extract builder columns
        codeColumns = getBuilderColumns(builderPath, arrayConstName);
      });

      test('column count matches between YAML and code', () => {
        expect(yamlData.columns.length).toBe(codeColumns.length);
      });

      test('every column key matches in order', () => {
        const yamlKeys = yamlData.columns.map((c) => c.key);
        const codeKeys = codeColumns.map((c) => c.key);
        expect(yamlKeys).toEqual(codeKeys);
      });

      test('every column header (header_vi) matches in order', () => {
        const yamlHeaders = yamlData.columns.map((c) => c.header_vi);
        const codeHeaders = codeColumns.map((c) => c.header);
        expect(yamlHeaders).toEqual(codeHeaders);
      });

      test('YAML feature_id matches expected export type', () => {
        expect(yamlData.feature_id).toBe(feature_id);
      });

      test('YAML has required metadata fields', () => {
        expect(yamlData.display_name_vi).toBeDefined();
        expect(yamlData.display_name_en).toBeDefined();
        expect(yamlData.status).toBeDefined();
        expect(yamlData.ui_entry_points).toBeDefined();
        expect(yamlData.api_routes).toBeDefined();
        expect(yamlData.permission_required).toBeDefined();
        expect(yamlData.code_refs).toBeDefined();
      });
    });
  });
});
