import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGS, LANG_LABELS, STORAGE_KEY, type SupportedLang } from '@/i18n';

export function LanguageToggle() {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium uppercase">{currentLang}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                lang === currentLang ? 'text-orange-600 font-medium bg-orange-50' : 'text-gray-700'
              }`}
            >
              <span>{lang === 'en' ? '🇬🇧' : '🇻🇳'}</span>
              <span>{LANG_LABELS[lang]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
