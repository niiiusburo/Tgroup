'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/services/pricingSheetSync.js]
 * @crossref:uses[api/src/services/pricingSheetCategoryMap.js]
 */

const {
  CATEGORY_MAP,
  HEADER_KEYWORDS,
  SUB_SECTION_SKIP,
} = require('./pricingSheetCategoryMap');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanPrice(price) {
  if (!price) return '';
  const p = String(price).trim();
  const digits = p.replace(/\./g, '').replace(/,/g, '').replace(/ /g, '');
  if (/^\d+$/.test(digits)) return `${p}đ`;
  return p;
}

function resolveCategory(headerText) {
  const upper = headerText.toUpperCase();
  let catInfo = CATEGORY_MAP[upper];
  if (!catInfo) {
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      if (value.matchFuzzy && upper.includes(key)) {
        catInfo = value;
        break;
      }
    }
  }
  if (!catInfo) {
    return { id: slugify(upper), icon: '🔹' };
  }
  return { id: catInfo.id, icon: catInfo.icon };
}

/**
 * Parse raw Google Sheet rows (column B=name, C=price, D=bonus) into pricing categories.
 * Mirrors ctv2checkin/modules/pricing_sync.py.
 */
function parsePricingRows(rows) {
  const categories = [];
  let currentCategory = null;

  for (let i = 0; i < rows.length; i += 1) {
    if (i < 2) continue;

    const row = rows[i] || [];
    const colB = (row[1] || '').trim();
    const colC = (row[2] || '').trim();
    const colD = (row[3] || '').trim();

    if (!colB) continue;

    const hasPrice = Boolean(colC) && colC.toUpperCase() !== 'GIÁ DỊCH VỤ';
    const colBUpper = colB.toUpperCase();

    if (colC && colC.toUpperCase().includes('GIÁ DỊCH VỤ')) continue;
    if (!hasPrice && SUB_SECTION_SKIP.some((skip) => colBUpper.includes(skip))) continue;
    if (!hasPrice && colB.length > 80) continue;

    const hasKeyword = HEADER_KEYWORDS.some((kw) => colBUpper.includes(kw));
    const isHeader = !hasPrice && (colB === colB.toUpperCase() || hasKeyword);

    if (isHeader && colB !== '1cc') {
      const catInfo = resolveCategory(colB);
      currentCategory = {
        id: catInfo.id,
        name: colB,
        icon: catInfo.icon,
        items: [],
      };
      categories.push(currentCategory);
    } else if (currentCategory && colB) {
      let badge = null;
      const bUpper = colB.toUpperCase();
      if (
        bUpper.includes('PREMIUM')
        || bUpper.includes('JUVERDERM')
        || bUpper.includes('SỤN MỸ')
        || bUpper.includes('SỤN SUGIFORM')
        || bUpper.includes('BOTOX MỸ')
      ) {
        badge = 'Premium';
      }
      if (bUpper.includes('NANO ERGONOMIX')) badge = 'Hot';

      currentCategory.items.push({
        name: colB,
        price: cleanPrice(colC),
        bonus: colD,
        badge,
      });
    }
  }

  return categories.filter((cat) => cat.items.length > 0);
}

module.exports = {
  parsePricingRows,
  cleanPrice,
  slugify,
};