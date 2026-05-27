import { ArrowDown, ArrowUp, Mail, Network, Phone, RefreshCw, UserRound, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { CtvHierarchyNode, CtvHierarchyResponse } from '@/lib/api/ctv';
import { cn } from '@/lib/utils';

interface CtvHierarchyPanelProps {
  readonly hierarchy: CtvHierarchyResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}

function formatJoinedDate(value: string | null | undefined, language: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function NodeRow({
  node,
  variant,
}: {
  readonly node: CtvHierarchyNode;
  readonly variant: 'current' | 'upline' | 'downline';
}) {
  const { t, i18n } = useTranslation('ctv');
  const joinedDate = formatJoinedDate(node.joinedAt, i18n.language);
  const isCurrent = variant === 'current';
  const accentClass =
    variant === 'upline' ? 'bg-sky-50 text-sky-600' : variant === 'downline' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600';

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
            <h3 className="min-w-0 truncate text-sm font-bold text-gray-900">{node.name}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
              {isCurrent ? t('hierarchy.currentTitle') : t('hierarchy.level', { level: node.level })}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.lobs.map((lob) => (
              <span key={lob} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-600">
                {t(`lobs.${lob}`)}
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

export function CtvHierarchyPanel({ hierarchy, isLoading, error, onRetry }: CtvHierarchyPanelProps) {
  const { t } = useTranslation('ctv');

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
        <StatItem
          label={t('hierarchy.statsDirect')}
          value={hierarchy.totals.directDownlineCount}
          icon={<UsersRound className="h-4 w-4" />}
        />
        <StatItem
          label={t('hierarchy.statsTotal')}
          value={hierarchy.totals.downlineCount}
          icon={<ArrowDown className="h-4 w-4" />}
        />
        <StatItem
          label={t('hierarchy.statsUpline')}
          value={hierarchy.totals.uplineCount}
          icon={<ArrowUp className="h-4 w-4" />}
        />
      </div>

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
          <EmptyHierarchy
            icon={<ArrowUp className="h-5 w-5" />}
            title={t('hierarchy.noUpline')}
            body={t('hierarchy.noUplineBody')}
          />
        )}
      </section>

      <section aria-labelledby="ctv-hierarchy-downline">
        <h3 id="ctv-hierarchy-downline" className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
          <ArrowDown className="h-4 w-4 text-emerald-600" />
          {t('hierarchy.downlineTitle')}
        </h3>
        {hierarchy.downline.length > 0 ? (
          <div className="space-y-2">
            {hierarchy.downline.map((node) => (
              <NodeRow key={`${node.id}:${node.lobs.join('-')}`} node={node} variant="downline" />
            ))}
          </div>
        ) : (
          <EmptyHierarchy
            icon={<UsersRound className="h-5 w-5" />}
            title={t('hierarchy.noDownlineTitle')}
            body={t('hierarchy.noDownlineBody')}
          />
        )}
      </section>
    </div>
  );
}
