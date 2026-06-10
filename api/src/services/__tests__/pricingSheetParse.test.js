'use strict';

const { parsePricingRows } = require('../pricingSheetParse');

describe('parsePricingRows', () => {
  it('maps category headers and priced rows from sheet layout', () => {
    const rows = [
      ['', 'BẢNG GIÁ', 'GIÁ DỊCH VỤ'],
      ['', 'Header row 2', ''],
      ['', 'FILLER HÀN CƠ BẢN', ''],
      ['', '1cc', '4.800.000'],
      ['', 'RĂNG SỨ THẨM MỸ', ''],
      ['', 'Răng sứ Zirconia', '3.500.000'],
    ];

    const categories = parsePricingRows(rows);
    expect(categories).toHaveLength(2);
    expect(categories[0].id).toBe('filler-basic');
    expect(categories[0].items[0]).toMatchObject({ name: '1cc', price: '4.800.000đ' });
    expect(categories[1].id).toBe('porcelain');
    expect(categories[1].items[0].name).toBe('Răng sứ Zirconia');
  });

  it('skips sub-section divider rows without prices', () => {
    const rows = [
      ['', 'x', ''],
      ['', 'y', ''],
      ['', 'NIỀNG RĂNG MẮC CÀI KIM LOẠI', ''],
      ['', 'MẮC CÀI KIM LOẠI TIÊU CHUẨN', ''],
      ['', 'Gói A', '10.000.000'],
    ];

    const categories = parsePricingRows(rows);
    expect(categories).toHaveLength(1);
    expect(categories[0].items).toHaveLength(1);
  });
});