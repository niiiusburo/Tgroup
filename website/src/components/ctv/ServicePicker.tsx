/**
 * @crossref:domain[ctv]
 * @crossref:used-in[grouped searchable service selector: website/src/components/ctv/CtvReferModal.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (CtvServiceOption type), website/src/lib/utils.ts (normalizeText), product-map/domains/ctv.yaml]
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { normalizeText } from '@/lib/utils';
import type { CtvServiceOption } from '@/lib/api/ctv';

/**
 * ServicePicker — grouped, searchable service selector for the CTV refer/booking form.
 *
 * Replaces a flat native <select> that could list ~450 services (dental). Services are
 * grouped by catalog category into collapsible sections that expand INLINE; a search box
 * filters diacritic-insensitively and auto-expands matching groups. Selecting is OPTIONAL —
 * a pinned "no service" row clears the choice (value === '').
 *
 * Renders the panel in normal flow (not an absolute dropdown) so the parent modal's
 * `overflow-y-auto` cannot clip it on mobile.
 */

interface ServicePickerProps {
  readonly services: readonly CtvServiceOption[];
  /** Selected service id, or '' for none (the optional default). */
  readonly value: string;
  readonly onChange: (serviceId: string) => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
}

interface ServiceGroup {
  readonly key: string;
  readonly id: string | null;
  readonly name: string;
  readonly items: readonly CtvServiceOption[];
}

const UNCAT_KEY = '__uncategorized__';

export function ServicePicker({ services, value, onChange, loading = false, disabled = false }: ServicePickerProps) {
  const { t } = useTranslation('ctv');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = services.find((s) => s.id === value) ?? null;
  const isDisabled = disabled || loading;
  const norm = normalizeText(search.trim());
  const searching = norm.length > 0;

  // Group services by category; uncategorized sinks to the bottom.
  const groups = useMemo<ServiceGroup[]>(() => {
    const uncatLabel = t('forms.referClient.serviceUncategorized');
    const map = new Map<string, { id: string | null; name: string; items: CtvServiceOption[] }>();
    for (const s of services) {
      const key = s.category?.id ?? UNCAT_KEY;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { id: s.category?.id ?? null, name: s.category?.name || uncatLabel, items: [] };
        map.set(key, bucket);
      }
      bucket.items.push(s);
    }
    return [...map.entries()]
      .map(([key, g]) => ({ key, id: g.id, name: g.name, items: g.items }))
      .sort((a, b) => {
        if (a.id === null) return 1;
        if (b.id === null) return -1;
        return a.name.localeCompare(b.name);
      });
  }, [services, t]);

  // Filter by search; drop emptied groups.
  const visibleGroups = useMemo<ServiceGroup[]>(() => {
    if (!searching) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((s) => normalizeText(s.name).includes(norm)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, searching, norm]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // On open: focus search and pre-expand the selected service's group.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setExpanded(new Set([selected?.category?.id ?? (selected ? UNCAT_KEY : '')]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function pick(serviceId: string) {
    onChange(serviceId);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !isDisabled && setOpen((p) => !p)}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left outline-none transition-colors focus:ring-2 focus:ring-orange-500 ${
          isDisabled ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-gray-200 bg-white text-gray-900'
        }`}
      >
        <span className={`flex-1 truncate text-sm ${selected ? 'font-medium' : 'text-gray-400'}`}>
          {loading
            ? t('forms.referClient.serviceLoading')
            : selected
              ? selected.name
              : t('forms.referClient.servicePlaceholder')}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !isDisabled ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('forms.referClient.serviceSearch')}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    inputRef.current?.focus();
                  }}
                  aria-label={t('forms.referClient.serviceClear')}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto py-1" role="listbox">
            <button
              type="button"
              onClick={() => pick('')}
              className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${
                value === '' ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{t('forms.referClient.serviceNone')}</span>
              {value === '' ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>

            {visibleGroups.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">{t('forms.referClient.serviceNoResults')}</p>
            ) : (
              visibleGroups.map((g) => {
                const groupOpen = searching || expanded.has(g.key);
                return (
                  <div key={g.key} className="border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      aria-expanded={groupOpen}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50"
                    >
                      <Layers className="h-4 w-4 shrink-0 text-orange-400" />
                      <span className="flex-1 truncate text-sm font-semibold text-gray-800">{g.name}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        {g.items.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${groupOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {groupOpen ? (
                      <ul>
                        {g.items.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={s.id === value}
                              onClick={() => pick(s.id)}
                              className={`flex w-full items-center justify-between gap-3 py-2 pl-11 pr-4 text-left text-sm ${
                                s.id === value ? 'bg-orange-50 font-medium text-orange-700' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate">{s.name}</span>
                              {s.id === value ? <Check className="h-4 w-4 shrink-0" /> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
