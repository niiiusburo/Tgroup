'use strict';

const ExcelJS = require('exceljs');
const {
  assertSafeTarget,
  buildPlan,
  identityKey,
  parseCatalogWorkbook,
  parseMoney,
  normalizedKey,
  toCsv,
} = require('../scripts/import-nk3-cosmetic-catalog');

async function buildWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();
  const services = workbook.addWorksheet('Dịch vụ');
  services.getCell('B2').value = 'Nhóm dịch vụ';
  services.getCell('C2').value = 'Dịch vụ';
  services.getCell('D2').value = 'Giá dịch vụ';
  services.addRow([null, 'Filler', '1cc Filler Hàn', 6000000]);
  services.addRow([null, 'Thẩm mỹ mắt', 'Cắt mí Line Mini', 12500000]);
  services.addRow([null, 'Công nghệ cao', 'Nâng cơ trẻ hóa vùng mắt Ultherapy', 20000000]);
  services.addRow([null, 'Công nghệ cao', 'Nâng cơ trẻ hóa vùng mặt Ultherapy', 30000000]);
  services.addRow([null, 'Dịch vụ khác', '', 0]);

  const locations = workbook.addWorksheet('Chi nhánh');
  locations.getCell('B2').value = 'Thẩm mỹ Hà Nội';
  locations.getCell('B3').value = 'Thẩm mỹ Hồ Chí Minh';
  return workbook.xlsx.writeBuffer();
}

describe('NK3 cosmetic catalog import helpers', () => {
  test('parses the cosmetic Google Sheet shape into services, categories, and locations', async () => {
    const parsed = await parseCatalogWorkbook(await buildWorkbookBuffer());

    expect(parsed.services).toEqual([
      expect.objectContaining({ category: 'Filler', name: '1cc Filler Hàn', price: 6000000 }),
      expect.objectContaining({ category: 'Thẩm mỹ mắt', name: 'Cắt mí Line Mini', price: 12500000 }),
      expect.objectContaining({ category: 'Công nghệ cao', name: 'Nâng cơ trẻ hóa vùng mắt Ultherapy', price: 20000000 }),
      expect.objectContaining({ category: 'Công nghệ cao', name: 'Nâng cơ trẻ hóa vùng mặt Ultherapy', price: 30000000 }),
    ]);
    expect(parsed.categories.map((category) => category.name)).toEqual(['Filler', 'Thẩm mỹ mắt', 'Công nghệ cao']);
    expect(parsed.locations.map((location) => location.name)).toEqual(['Thẩm mỹ Hà Nội', 'Thẩm mỹ Hồ Chí Minh']);
    expect(parsed.anomalies).toEqual([
      expect.objectContaining({ rowNumber: 7, reason: 'missing_category_name_or_positive_price' }),
    ]);
  });

  test('normalizes Vietnamese names and money values consistently', () => {
    expect(normalizedKey('Thẩm mỹ Hồ Chí Minh')).toBe('tham my ho chi minh');
    expect(identityKey('Nâng cơ trẻ hóa vùng mắt')).not.toBe(identityKey('Nâng cơ trẻ hóa vùng mặt'));
    expect(parseMoney('12,500,000 đ')).toBe(12500000);
    expect(toCsv([['service', 'price'], ['A, B', 10]])).toBe('service,price\n"A, B",10\n');
  });

  test('builds a non-destructive delta plan for current cosmetic catalog rows', async () => {
    const parsed = await parseCatalogWorkbook(await buildWorkbookBuffer());
    const current = {
      products: [
        { id: 'existing-filler', name: '1cc Filler Hàn', namenosign: '1cc filler han', active: true, type: 'service' },
        { id: 'old-demo', name: 'Laser Hair Removal - Full Body', namenosign: 'laser hair removal - full body', active: true, type: 'service' },
      ],
      categories: [
        { id: 'existing-filler-cat', name: 'Filler', active: true },
        { id: 'old-demo-cat', name: 'Laser & Light', active: true },
      ],
      companies: [
        { id: 'hanoi', name: 'Thẩm mỹ Hà Nội', active: true },
      ],
    };

    const plan = buildPlan(parsed, current);
    expect(plan.servicesToUpdate).toHaveLength(1);
    expect(plan.servicesToCreate).toHaveLength(3);
    expect(plan.productsToInactivate).toEqual([
      expect.objectContaining({ id: 'old-demo' }),
    ]);
    expect(plan.locationsToCreate).toEqual([
      expect.objectContaining({ name: 'Thẩm mỹ Hồ Chí Minh' }),
    ]);
  });

  test('refuses dental, NK, and NK2 targets before apply', () => {
    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@127.0.0.1:5433/tdental_demo',
      target: 'local',
      apply: false,
    })).toThrow(/dental|NK|NK2/i);

    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@nk2-db:5433/tcosmetic_demo',
      target: 'nk3',
      apply: false,
    })).toThrow(/dental|NK|NK2/i);

    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@nk3-db:5433/tcosmetic_demo',
      target: 'nk2',
      apply: false,
    })).toThrow(/Only local and nk3/);

    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@nk3-db:5433/tcosmetic_smoketest',
      target: 'nk3',
      apply: false,
    })).not.toThrow();

    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@127.0.0.1:5433/tcosmetic_smoketest',
      target: 'local',
      apply: false,
    })).toThrow(/tcosmetic_demo only/);
  });

  test('requires explicit environment confirmation before applying to NK3', () => {
    const previous = process.env.CONFIRM_NK3_COSMETIC_IMPORT;
    delete process.env.CONFIRM_NK3_COSMETIC_IMPORT;
    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@nk3-db:5433/tcosmetic_demo',
      target: 'nk3',
      apply: true,
    })).toThrow(/CONFIRM_NK3_COSMETIC_IMPORT=YES/);
    process.env.CONFIRM_NK3_COSMETIC_IMPORT = 'YES';
    expect(() => assertSafeTarget({
      connectionString: 'postgresql://postgres@nk3-db:5433/tcosmetic_demo',
      target: 'nk3',
      apply: true,
    })).not.toThrow();
    if (previous === undefined) delete process.env.CONFIRM_NK3_COSMETIC_IMPORT;
    else process.env.CONFIRM_NK3_COSMETIC_IMPORT = previous;
  });
});
