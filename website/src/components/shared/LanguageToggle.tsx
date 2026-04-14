import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGS, LANG_LABELS, STORAGE_KEY, type SupportedLang } from '@/i18n';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language as SupportedLang;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (lang: SupportedLang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setOpen(false);
  };

  // In compact mode (collapsed sidebar), only show icon
  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Switch language"
        >
          <Globe className="w-5 h-5" />
        </button>

        {open && (
          <div data-testid="lang-dropdown" className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-[200] min-w-[160px]">
            {SUPPORTED_LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => handleSelect(lang)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                  lang === currentLang ? 'text-orange-600 font-semibold bg-orange-50' : 'text-gray-700'
                }`}
              >
                <span className="text-base">{lang === 'en' ? '🇬🇧' : '🇻🇳'}</span>
                <span>{LANG_LABELS[lang]}</span>
                {lang === currentLang && (
                  <Check className="w-3.5 h-3.5 ml-auto text-orange-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-medium">
          {currentLang === 'en' ? '🇬🇧 English' : '🇻🇳 Tiếng Việt'}
        </span>
      </button>

      {open && (
        <div data-testid="lang-dropdown" className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-[200] min-w-[160px]">
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                lang === currentLang ? 'text-orange-600 font-semibold bg-orange-50' : 'text-gray-700'
              }`}
            >
              <span className="text-base">{lang === 'en' ? '🇬🇧' : '🇻🇳'}</span>
              <span>{LANG_LABELS[lang]}</span>
              {lang === currentLang && (
                <Check className="w-3.5 h-3.5 ml-auto text-orange-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
