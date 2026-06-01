import { useEffect } from 'react';

import './landing.css';
import logo from './tam-logo-group.png';

/**
 * Tâm Group landing page.
 *
 * Faithful React port of the CTV affiliate app's standalone landing
 * (ctv.thammyvientam.com `/` -> templates/landing.html). Public route, no auth.
 * The three CTA links keep the original relative hrefs (/booking, /ctv/signup,
 * /ctv/portal) exactly as authored — they target the CTV app's routes and are
 * intentionally left as-is in this repo.
 *
 * @crossref:route[path="/welcome", component=Landing]
 * @crossref:used-in[App]
 */

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap';

/** Inject the two display fonts the design depends on (mirrors the original <head>). */
function ensureFontLinks(): void {
  if (document.getElementById('tam-landing-fonts')) return;

  const preconnectGoogle = document.createElement('link');
  preconnectGoogle.rel = 'preconnect';
  preconnectGoogle.href = 'https://fonts.googleapis.com';

  const preconnectGstatic = document.createElement('link');
  preconnectGstatic.rel = 'preconnect';
  preconnectGstatic.href = 'https://fonts.gstatic.com';
  preconnectGstatic.crossOrigin = 'anonymous';

  const stylesheet = document.createElement('link');
  stylesheet.id = 'tam-landing-fonts';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONT_HREF;

  document.head.append(preconnectGoogle, preconnectGstatic, stylesheet);
}

export function Landing() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Tâm — Thẩm Mỹ Viện';
    ensureFontLinks();
    // Fonts are left cached in <head> on unmount to avoid a flash on re-entry.
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="tam-landing">
      <div className="stage" data-screen-label="Landing">
        <div className="halo" aria-hidden="true" />

        <div className="logo-wrap">
          <img className="logo" src={logo} alt="Tâm Group" />
        </div>

        <div className="actions">
          <a className="btn btn-cream" href="/booking">
            <span className="icon-chip">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span>Đặt Lịch Cho Khách</span>
          </a>

          <div className="actions-row">
            <a className="btn btn-copper" href="/ctv/signup">
              <span className="icon-chip">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </span>
              <span>Đăng Ký CTV</span>
            </a>
            <a className="btn btn-bronze" href="/ctv/portal">
              <span className="icon-chip">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </span>
              <span>Đăng Nhập</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Landing;
