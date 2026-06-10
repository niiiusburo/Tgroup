'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/services/pricingSheetParse.js]
 * @crossref:uses[ctv2checkin/modules/pricing_sync.py CATEGORY_MAP]
 */

/** Category headers from Google Sheet → stable HTML section ids (legacy ctv2checkin). */
const CATEGORY_MAP = {
  'FILLER HÀN CƠ BẢN': { id: 'filler-basic', icon: '💉' },
  'FILLER HÀN CAO CẤP': { id: 'filler-premium', icon: '✨' },
  'DỊCH VỤ NÂNG NGỰC': { id: 'breast', icon: '🌸' },
  'TIÊM THON GỌN TỪNG VÙNG': { id: 'slimming', icon: '💫' },
  'THON GỌN HÀM V-LINE PERFECT': { id: 'vline', icon: '✓', matchFuzzy: true },
  'THON GỌN HÀM VLINE PERFECT': { id: 'vline', icon: '✓' },
  'DỊCH VỤ KHÁC': { id: 'other', icon: '⚡' },
  'NÂNG MŨI': { id: 'nose', icon: '👃' },
  'CÁC DỊCH VỤ VỀ MẮT': { id: 'eyes', icon: '👁' },
  'DỊCH VỤ VỀ MẮT': { id: 'eyes', icon: '👁' },
  'THẨM MỸ CÔ BÉ': { id: 'intimate', icon: '🌺' },
  'CĂNG DA MEDI LIFT': { id: 'facelift', icon: '✨' },
  'THẨM MỸ CÔNG NGHỆ CAO': { id: 'high-tech', icon: '🔬' },
  'NÂNG CƠ TÁO': { id: 'apple-lift', icon: '🍎', matchFuzzy: true },
  'RĂNG SỨ THẨM MỸ': { id: 'porcelain', icon: '🦷' },
  'TRỒNG RĂNG IMPLANT': { id: 'implant', icon: '🦷' },
  'NIỀNG RĂNG MẮC CÀI KIM LOẠI': { id: 'braces-metal', icon: '🦷' },
  'NIỀNG RĂNG MẮC CÀI SỨ': { id: 'braces-ceramic', icon: '🦷' },
};

const HEADER_KEYWORDS = [
  'FILLER', 'DỊCH VỤ', 'NÂNG MŨI', 'NÂNG NGỰC', 'THON GỌN', 'VLINE',
  'THẨM MỸ', 'CĂNG DA', 'NÂNG CƠ', 'CÔNG NGHỆ',
  'RĂNG SỨ', 'IMPLANT', 'MẮC CÀI', 'NIỀNG RĂNG', 'TRỒNG RĂNG',
];

const SUB_SECTION_SKIP = [
  'MẮC CÀI KIM LOẠI TIÊU CHUẨN', 'MẮC CÀI KIM LOẠI TỰ ĐÓNG',
  'MẮC CÀI KIM LOẠI TỰ ĐÓNG DAMON ULTIMA',
  'MẮC CÀI SỨ TIÊU CHUẨN', 'MẮC CÀI SỨ TỰ ĐÓNG',
  'BẢNG GIÁ THẨM MỸ VIỆN TẤM',
];

/** Default pricing Google Sheet (legacy ctv2checkin PRICING_CATALOG runbook). */
const DEFAULT_PRICING_SHEET_ID = '19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY';

const DEFAULT_PRICING_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${DEFAULT_PRICING_SHEET_ID}/edit`;

module.exports = {
  CATEGORY_MAP,
  HEADER_KEYWORDS,
  SUB_SECTION_SKIP,
  DEFAULT_PRICING_SHEET_ID,
  DEFAULT_PRICING_SHEET_URL,
};