'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/services/pricingSheetSync.js, website/scripts/generate-bang-gia.mjs]
 * @crossref:uses[website/public/bang-gia/pricing.css, website/public/bang-gia/pricing.js, product-map/domains/ctv.yaml]
 */

const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseVndPrice(price) {
  if (!price) return null;
  const raw = String(price).trim().toLowerCase().replace(/đ/g, '').replace(/vnd/g, '').trim();
  const normalized = raw.replace(/\./g, '').replace(/,/g, '').replace(/ /g, '');
  if (!/^\d+$/.test(normalized)) return null;
  return BigInt(normalized);
}

function formatVnd(amount) {
  const n = Number(amount);
  return `${Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.')}đ`;
}

function applyDiscount(pricingData, discountConfig) {
  if (!discountConfig?.active) return { pricingData, discount: null };
  const rate = Number(discountConfig.rate ?? 0);
  if (!(rate > 0 && rate < 1)) return { pricingData, discount: null };

  const data = structuredClone(pricingData);
  let discountedItems = 0;
  const multiplier = 1 - rate;

  for (const category of data.categories ?? []) {
    for (const item of category.items ?? []) {
      const original = parseVndPrice(item.price);
      if (original == null) continue;
      item.original_price = item.price;
      item.discounted_price = formatVnd(Number(original) * multiplier);
      item.discount_active = true;
      discountedItems += 1;
    }
  }

  if (discountedItems === 0) return { pricingData, discount: null };
  return {
    pricingData: data,
    discount: {
      active: true,
      percent: Math.round(rate * 100),
      label: discountConfig.label ?? `Giảm ${Math.round(rate * 100)}%`,
    },
  };
}

function renderCategories(categories) {
  const nav = categories
    .map(
      (cat, i) => `
                <a href="#${esc(cat.id)}" class="category-link ${i === 0 ? 'active' : ''}"
                    data-category="${esc(cat.id)}" data-tooltip="${esc(cat.name)}">
                    <span class="category-icon">${esc(cat.icon)}</span>
                    <span>${esc(cat.name)}</span>
                </a>`,
    )
    .join('\n');

  const sections = categories
    .map((cat) => {
      const cards = (cat.items ?? [])
        .map((item) => {
          const classes = [
            'pricing-card',
            item.bonus ? 'has-bonus' : '',
            item.badge === 'Premium' || item.badge === 'Mỹ' ? 'premium' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const priceHtml = item.discount_active
            ? `<span class="discounted-price">${esc(item.discounted_price)}</span>`
            : `<span class="regular-price">${esc(item.price)}</span>`;
          return `
                        <div class="${classes}">
                            ${item.badge ? `<div class="card-badge">${esc(item.badge)}</div>` : ''}
                            <div class="card-name">${esc(item.name)}</div>
                            <div class="card-price ${item.discount_active ? 'discounted' : ''}">${priceHtml}</div>
                            ${item.bonus ? `<div class="card-bonus">${esc(item.bonus)}</div>` : ''}
                            ${item.note ? `<div class="card-note">${esc(item.note)}</div>` : ''}
                        </div>`;
        })
        .join('\n');

      return `
            <section id="${esc(cat.id)}" class="pricing-section">
                <div class="section-header" onclick="toggleSection(this)">
                    <h2>
                        <span class="section-icon">${esc(cat.icon)}</span>
                        ${esc(cat.name)}
                    </h2>
                    <svg class="collapse-icon" viewBox="0 0 24 24" width="24" height="24">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                <div class="section-content">
                    <div class="pricing-grid">${cards}
                    </div>
                </div>
            </section>`;
    })
    .join('\n');

  return { nav, sections };
}

function buildBangGiaHtml(categories, discount) {
  const { nav, sections } = renderCategories(categories);
  const discountBanner = discount
    ? `<div class="discount-banner" aria-label="Bảng giá được trừ ${discount.percent}%">
                    <span class="discount-copy">
                        Bảng giá được trừ
                        <span class="discount-percent-pill">${discount.percent}%</span>
                        tối đa cộng tác viên có thể giảm cho khách.
                    </span>
                </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Giá Thẩm Mỹ Viện Tấm</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/bang-gia/pricing.css">
</head>
<body>
    <header class="top-nav">
        <div class="top-nav-content">
            <a href="/ctv" class="back-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Về Cổng CTV</span>
            </a>
            <h1 class="page-title-header">Bảng Giá</h1>
            <div class="last-updated-badge" id="lastUpdatedBadge" title="Tự động cập nhật mỗi 30 giây">
                <svg class="sync-icon" viewBox="0 0 24 24" width="14" height="14">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span class="update-time" id="updateTime">--:--</span>
            </div>
        </div>
    </header>

    <button class="mobile-category-toggle" id="mobileCategoryToggle" type="button">
        <svg viewBox="0 0 24 24" width="20" height="20">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span>Danh mục</span>
    </button>

    <div class="pricing-container">
        <aside class="pricing-sidebar" id="pricingSidebar">
            <div class="sidebar-title">Danh Mục</div>
            <nav class="category-nav">${nav}
                <a href="/welcome?book=1" class="category-link booking-link" data-tooltip="Đặt lịch">
                    <span class="category-icon">📅</span>
                    <span>Đặt lịch</span>
                </a>
                <a href="/catalogue" class="category-link" data-tooltip="Catalog">
                    <span class="category-icon">📖</span>
                    <span>Catalog</span>
                </a>
                <a href="/ctv" class="category-link" data-tooltip="CTV Portal">
                    <span class="category-icon">🏠</span>
                    <span>CTV Portal</span>
                </a>
            </nav>
        </aside>

        <main class="pricing-content">
            <div class="page-title">
                <h1>Bảng Giá Dịch Vụ</h1>
                ${discountBanner}
            </div>
            ${sections}
        </main>
    </div>

    <button class="scroll-top" id="scrollTopBtn" onclick="scrollToTop()">
        <svg viewBox="0 0 24 24" width="24" height="24">
            <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
    </button>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <script src="/bang-gia/pricing.js"></script>
</body>
</html>`;
}

function resolveBangGiaOutputDir(customDir) {
  if (customDir) return customDir;
  if (process.env.BANG_GIA_OUTPUT_DIR) return process.env.BANG_GIA_OUTPUT_DIR;
  return path.resolve(__dirname, '../../../website/public/bang-gia');
}

function loadDiscountConfig(outputDir) {
  const discountPath = path.join(outputDir, 'data', 'pricing_discount.json');
  try {
    return JSON.parse(fs.readFileSync(discountPath, 'utf8'));
  } catch {
    return { active: false };
  }
}

function writeBangGiaArtifacts({ outputDir, categories, updatedAt }) {
  const dir = resolveBangGiaOutputDir(outputDir);
  const dataDir = path.join(dir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const pricingPayload = { categories, updated_at: updatedAt };
  const discountConfig = loadDiscountConfig(dir);
  const { pricingData: baked, discount } = applyDiscount(pricingPayload, discountConfig);
  const bakedCategories = baked.categories ?? [];

  // Source prices only in JSON (discount is display-only in HTML — legacy ctv2checkin rule).
  fs.writeFileSync(
    path.join(dataDir, 'pricing.json'),
    JSON.stringify(pricingPayload, null, 2),
    'utf8',
  );

  const html = buildBangGiaHtml(bakedCategories, discount);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

  return {
    outputDir: dir,
    categoryCount: bakedCategories.length,
    itemCount: bakedCategories.reduce((sum, c) => sum + (c.items?.length ?? 0), 0),
    updatedAt,
  };
}

module.exports = {
  applyDiscount,
  buildBangGiaHtml,
  resolveBangGiaOutputDir,
  writeBangGiaArtifacts,
};