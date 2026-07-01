/**
 * @crossref:domain[ctv]
 * @crossref:used-in[upline/downline hierarchy view: website/src/components/commission/CtvManagementTab.tsx, website/src/pages/CTV/tabs/CtvNetworkTab.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (CtvHierarchyNode/CtvHierarchyResponse types), website/src/lib/i18n/ctv.ts, website/src/lib/utils.ts, product-map/domains/ctv.yaml]
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Coins,
  Mail,
  Network,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useCtvLocale } from '@/lib/i18n/ctv';
import type { CtvHierarchyNode, CtvHierarchyResponse } from '@/lib/api/ctv';
import { ctvDownlineDomId } from '@/pages/CTV/ctvCommissionNavigate';
import { cn, normalizeText } from '@/lib/utils';

interface CtvHierarchyPanelProps {
  readonly hierarchy: CtvHierarchyResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly focusDownlineId?: string | null;
}

function NodeRow({
  node,
  variant,
}: {
  readonly node: CtvHierarchyNode;
  readonly variant: 'current' | 'upline';
}) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const joinedDate = ctv.formatJoinedDate(node.joinedAt);
  const isCurrent = variant === 'current';
  const accentClass = variant === 'upline' ? 'bg-sky-50 text-sky-600' : 'bg-orange-50 text-orange-600';

  return (
    <article
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm shadow-gray-200/40',
        isCurrent ? 'border-orange-200' : 'border-gray-200'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', accentClass)}>
          {isCurrent ? <UserRound className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-bold text-gray-900">{node.name || ctv.unknownClient()}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
              {isCurrent ? t('hierarchy.currentTitle') : t('hierarchy.level', { level: node.level })}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.lobs.map((lob) => (
              <span key={lob} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-600">
                {ctv.getLobLabel(lob)}
              </span>
            ))}
            {!isCurrent && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                {t('hierarchy.directCount', { count: node.directDownlineCount })}
              </span>
            )}
          </div>

          <div className="mt-2 space-y-1 text-xs font-medium text-gray-500">
            {node.phone ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{node.phone}</span>
              </p>
            ) : null}
            {node.email ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{node.email}</span>
              </p>
            ) : null}
            {joinedDate ? <p>{t('hierarchy.joined', { date: joinedDate })}</p> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

// Collapsible downline member card: collapsed shows name + level + this CTV's projected cut;
// expanded reveals where that cut comes from (the member's own earnings × the level rate) plus contact/LOB detail.
function DownlineCard({
  node,
  expanded,
  highlighted,
  onToggle,
}: {
  readonly node: CtvHierarchyNode;
  readonly expanded: boolean;
  readonly highlighted?: boolean;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const earned = node.earned ?? 0;
  const contribution = node.overrideContribution ?? 0;
  const ratePct = earned > 0 ? Math.round((contribution / earned) * 1000) / 10 : 0;

  return (
    <div
      id={ctvDownlineDomId(node.id)}
      className={cn(
        'overflow-hidden rounded-lg border bg-white shadow-sm shadow-gray-200/40',
        highlighted ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
      )}
    >
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <UsersRound className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-sm font-bold text-gray-900">{node.name || ctv.unknownClient()}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
              {t('hierarchy.level', { level: node.level })}
            </span>
          </div>
          {node.phone ? <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{node.phone}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-orange-600">{ctv.formatCurrency(contribution)}</p>
          <p className="text-[10px] font-medium text-gray-400">{t('hierarchy.yourCut')}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3">
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 font-medium text-gray-500">
                <Coins className="h-3.5 w-3.5" />
                {t('hierarchy.theyEarned')}
              </dt>
              <dd className="font-bold text-gray-900">{ctv.formatCurrency(earned)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="font-medium text-gray-500">{t('hierarchy.yourPotential', { rate: ratePct })}</dt>
              <dd className="font-bold text-orange-600">{ctv.formatCurrency(contribution)}</dd>
            </div>
          </dl>
          <div className="mt-2 space-y-1 text-xs font-medium text-gray-500">
            {node.lobs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {node.lobs.map((lob) => (
                  <span key={lob} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-600">
                    {ctv.getLobLabel(lob)}
                  </span>
                ))}
              </div>
            ) : null}
            {node.email ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{node.email}</span>
              </p>
            ) : null}
            {node.directDownlineCount > 0 ? <p>{t('hierarchy.directCount', { count: node.directDownlineCount })}</p> : null}
            {node.joinedAt ? <p>{t('hierarchy.joined', { date: ctv.formatJoinedDate(node.joinedAt) })}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: number;
  readonly icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase text-gray-500">{label}</p>
        <span className="text-orange-500">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function LoadingHierarchy() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white" />
      ))}
    </div>
  );
}

function EmptyHierarchy({
  title,
  body,
  icon,
}: {
  readonly title: string;
  readonly body: string;
  readonly icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-500">{icon}</div>
      <h3 className="mt-3 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}

// Flip card for the downline override. Front = the projected total (₫ + %); tap to flip and
// reveal WHERE it comes from — each earning downline member with the total paid to THEM and
// the CTV's projected cut from that member. Mirrors the Track tab's ReferralFlipCard mechanism.
function PotentialFlipCard({
  totals,
  downline,
}: {
  readonly totals: CtvHierarchyResponse['totals'];
  readonly downline: CtvHierarchyNode[];
}) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const [isFlipped, setIsFlipped] = useState(false);

  // Members that actually feed the potential, biggest contributor first.
  const sources = useMemo(
    () =>
      downline
        .filter((node) => (node.overrideContribution ?? 0) > 0 || (node.earned ?? 0) > 0)
        .sort((a, b) => (b.overrideContribution ?? 0) - (a.overrideContribution ?? 0)),
    [downline]
  );

  return (
    <button
      type="button"
      onClick={() => setIsFlipped((value) => !value)}
      aria-expanded={isFlipped}
      aria-label={t(isFlipped ? 'hierarchy.flipBack' : 'hierarchy.flipToSource')}
      className="block w-full rounded-2xl text-left outline-none focus:ring-2 focus:ring-orange-300/40"
    >
      <div className="relative min-h-[176px] [perspective:1200px]">
        <div
          className={cn(
            'absolute inset-0 rounded-2xl transition-transform duration-300 motion-reduce:transition-none [transform-style:preserve-3d]',
            isFlipped && '[transform:rotateY(180deg)]'
          )}
        >
          {/* FRONT — summary */}
          <div
            aria-hidden={isFlipped}
            className={cn(
              'absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 [backface-visibility:hidden]',
              isFlipped && 'invisible'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">{t('hierarchy.potentialTitle')}</p>
                <p className="mt-1 text-2xl font-extrabold leading-tight text-gray-900">
                  {ctv.formatCurrency(totals.potentialOverride ?? 0)}
                </p>
                <p className="mt-1 text-xs font-medium text-orange-700/80">
                  {t('hierarchy.potentialHint', { rate: totals.overrideRatePct ?? 0, count: totals.downlineCount })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600 ring-1 ring-inset ring-orange-300">
                {t('hierarchy.projectedBadge')}
              </span>
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[11px] font-bold text-orange-600">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('hierarchy.flipToSource')}
            </span>
          </div>

          {/* BACK — where the earnings come from */}
          <div
            aria-hidden={!isFlipped}
            className={cn(
              'absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-orange-200 bg-white p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]',
              !isFlipped && 'invisible'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">{t('hierarchy.sourceLabel')}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600">
                <RotateCcw className="h-3.5 w-3.5" />
                {t('hierarchy.flipBack')}
              </span>
            </div>

            {sources.length === 0 ? (
              <p className="mt-3 text-xs leading-5 text-gray-500">{t('hierarchy.noEarningSource')}</p>
            ) : (
              <ul className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {sources.map((node) => (
                  <li
                    key={node.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/70 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-gray-900">{node.name || ctv.unknownClient()}</p>
                      <p className="truncate text-[10px] font-medium text-gray-400">
                        {t('hierarchy.level', { level: node.level })} · {t('hierarchy.paidToThem')}: {ctv.formatCurrency(node.earned ?? 0)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-orange-600">{ctv.formatCurrency(node.overrideContribution ?? 0)}</p>
                      <p className="text-[10px] font-medium text-gray-400">{t('hierarchy.yourCut')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function CtvHierarchyPanel({
  hierarchy,
  isLoading,
  error,
  onRetry,
  focusDownlineId = null,
}: CtvHierarchyPanelProps) {
  const { t } = useTranslation('ctv');
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!focusDownlineId || isLoading) return;
    const id = focusDownlineId.trim();
    setExpandedIds((prev) => new Set(prev).add(id));
    setQuery('');
    const timer = window.setTimeout(() => {
      document.getElementById(ctvDownlineDomId(id))?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [focusDownlineId, isLoading, hierarchy?.downline.length]);

  const downlineNodes = useMemo(() => hierarchy?.downline ?? [], [hierarchy]);

  const filteredDownline = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return downlineNodes;
    const terms = q.split(/\s+/).filter(Boolean);
    return downlineNodes.filter((node) => {
      const haystack = normalizeText(`${node.name || ''} ${node.phone || ''} ${node.email || ''}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [downlineNodes, query]);

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (isLoading) {
    return (
      <>
        <p className="sr-only">{t('hierarchy.loading')}</p>
        <LoadingHierarchy />
      </>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-white px-5 py-8 text-center" role="alert">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-500">
          <Network className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-gray-900">{t('hierarchy.errorTitle')}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">{error || t('hierarchy.errorBody')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-gray-900 px-4 text-xs font-bold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('hierarchy.retry')}
        </button>
      </div>
    );
  }

  if (!hierarchy) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <StatItem label={t('hierarchy.statsDirect')} value={hierarchy.totals.directDownlineCount} icon={<UsersRound className="h-4 w-4" />} />
        <StatItem label={t('hierarchy.statsTotal')} value={hierarchy.totals.downlineCount} icon={<ArrowDown className="h-4 w-4" />} />
        <StatItem label={t('hierarchy.statsUpline')} value={hierarchy.totals.uplineCount} icon={<ArrowUp className="h-4 w-4" />} />
      </div>

      {hierarchy.totals.downlineCount > 0 && (
        <PotentialFlipCard totals={hierarchy.totals} downline={downlineNodes} />
      )}

      <section aria-labelledby="ctv-hierarchy-current">
        <h3 id="ctv-hierarchy-current" className="mb-2 text-sm font-bold text-gray-900">
          {t('hierarchy.currentTitle')}
        </h3>
        <NodeRow node={hierarchy.current} variant="current" />
      </section>

      <section aria-labelledby="ctv-hierarchy-upline">
        <h3 id="ctv-hierarchy-upline" className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
          <ArrowUp className="h-4 w-4 text-sky-600" />
          {t('hierarchy.uplineTitle')}
        </h3>
        {hierarchy.upline.length > 0 ? (
          <div className="space-y-2">
            {hierarchy.upline.map((node) => (
              <NodeRow key={`${node.id}:${node.lobs.join('-')}`} node={node} variant="upline" />
            ))}
          </div>
        ) : (
          <EmptyHierarchy icon={<ArrowUp className="h-5 w-5" />} title={t('hierarchy.noUpline')} body={t('hierarchy.noUplineBody')} />
        )}
      </section>

      <section aria-labelledby="ctv-hierarchy-downline">
        <h3 id="ctv-hierarchy-downline" className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
          <ArrowDown className="h-4 w-4 text-emerald-600" />
          {t('hierarchy.downlineTitle')}
        </h3>

        {hierarchy.downline.length === 0 ? (
          <EmptyHierarchy icon={<UsersRound className="h-5 w-5" />} title={t('hierarchy.noDownlineTitle')} body={t('hierarchy.noDownlineBody')} />
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('hierarchy.searchPlaceholder')}
                aria-label={t('hierarchy.searchPlaceholder')}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t('hierarchy.clearSearch')}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {filteredDownline.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                {t('hierarchy.noMatch')}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredDownline.map((node) => (
                  <DownlineCard
                    key={`${node.id}:${node.lobs.join('-')}`}
                    node={node}
                    expanded={expandedIds.has(node.id)}
                    highlighted={
                      !!focusDownlineId &&
                      node.id.trim().toLowerCase() === focusDownlineId.trim().toLowerCase()
                    }
                    onToggle={() => toggleExpanded(node.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
