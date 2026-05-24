const fs = require('fs');
const path = require('path');

describe('service catalog mutations', () => {
  it('imports normalizeVietnamese before using it for product namenosign writes', () => {
    const productsSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'products.js'), 'utf8');

    expect(productsSource).toContain(
      "const { addAccentInsensitiveSearchCondition, normalizeVietnamese } = require('../utils/search');"
    );
    expect(productsSource).toContain('const nameNoSign = normalizeVietnamese(trimmedName);');
  });
});
