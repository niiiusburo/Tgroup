#!/usr/bin/env node
/**
 * Bake legacy ctv2checkin /bang-gia from pricing.json + pricing_discount.json.
 * Source: ../ctv2checkin/static/data (sibling repo) or website/public/bang-gia/data
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/bang-gia');
const legacyData = path.join(__dirname, '../../../ctv2checkin/static/data');
const localData = path.join(outDir, 'data');

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
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

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCategories(categories) {
  const nav = categories
    .map(
      (cat, i) => `
                <a href="#${esc(cat.id)}" class="category-link ${i === 0 ? 'active' : ''}"
                    data-category="${esc(cat.id)}" data-tooltip="${esc(cat.name)}">
                    <span class="category-icon">${esc(cat.icon)}</span>
                    <span>${esc(cat.name)}</span>
                </a>`
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

const pricingPath = fs.existsSync(path.join(localData, 'pricing.json'))
  ? path.join(localData, 'pricing.json')
  : path.join(legacyData, 'pricing.json');
const discountPath = fs.existsSync(path.join(localData, 'pricing_discount.json'))
  ? path.join(localData, 'pricing_discount.json')
  : path.join(legacyData, 'pricing_discount.json');

const pricingData = loadJson(pricingPath, { categories: [] });
const discountConfig = loadJson(discountPath, { active: false });
const { pricingData: baked, discount } = applyDiscount(pricingData, discountConfig);
const categories = baked.categories ?? [];
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

const html = `<!DOCTYPE html>
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

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });
fs.copyFileSync(pricingPath, path.join(outDir, 'data/pricing.json'));
fs.copyFileSync(discountPath, path.join(outDir, 'data/pricing_discount.json'));
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`✅ bang-gia: ${categories.length} categories → ${path.join(outDir, 'index.html')}`);