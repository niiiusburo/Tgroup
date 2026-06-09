/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 visual breadcrumb component: website/src/components/shared/Breadcrumbs]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAVIGATION_ITEMS, ROUTES, type NavigationItem } from '@/constants';

/**
 * Breadcrumbs — global, auto-generated navigation trail.
 *
 * Derives the crumb chain from the SAME source of truth the sidebar uses
 * (NAVIGATION_ITEMS in constants/index.ts), so it can never drift from the real
 * route hierarchy and needs no hand-maintained route map. Labels resolve through
 * the existing `nav` i18n namespace (identical keys the sidebar renders), so the
 * trail is bilingual (EN/VI) automatically.
 *
 * Rendered once in Layout above <Outlet/>, so every admin page gets it for free.
 *
 * Hierarchy handled:
 *   /                       -> (nothing; root page shows no trail)
 *   /calendar               -> Home › Calendar
 *   /commission             -> Home › Team › Commission        (group child)
 *   /reports/revenue        -> Home › Reports › Revenue        (real nested route)
 *   /customers/:id          -> Home › Customers                (dynamic segment folds to parent)
 *
 * a11y: <nav aria-label="Breadcrumb"> + <ol>, aria-current="page" on the leaf,
 * focusable links with visible focus ring, contrast-safe gray on white.
 */

interface Crumb {
  readonly label: string; // i18n key in the `nav` namespace
  readonly href?: string; // omitted for the current (leaf) page
}

/**
 * Group container paths (e.g. "/clinic", "/team", "/admin", "/reports") are NOT
 * real routes — they only exist to nest children in the sidebar. A group crumb is
 * rendered as plain text (no link) so we never produce a dead link.
 */
const GROUP_CONTAINER_PATHS: Record<string, true> = Object.fromEntries(
  NAVIGATION_ITEMS.filter((i) => i.children && i.children.length > 0).map((i) => [i.path, true])
);

/** Reports is the one group whose container path ("/reports") IS a real route. */
const REAL_GROUP_ROUTES: Record<string, true> = { [ROUTES.REPORTS]: true };

/**
 * Find the [parent?, leaf] navigation chain for a pathname.
 * Matches the deepest child first; falls back to a top-level item; finally to the
 * parent route for a dynamic detail page (e.g. /customers/123 -> /customers).
 */
function resolveChain(pathname: string): NavigationItem[] {
  // 1. Exact child match -> [parent, child]
  for (const item of NAVIGATION_ITEMS) {
    const child = item.children?.find((c) => c.path === pathname);
    if (child) return [item, child];
  }
  // 2. Exact top-level match -> [item]
  const top = NAVIGATION_ITEMS.find((i) => i.path === pathname);
  if (top) return [top];
  // 3. Dynamic/detail page: fold to the longest matching route prefix.
  //    e.g. /customers/123 -> /customers ; /reports/revenue/x -> /reports/revenue
  let best: NavigationItem[] | null = null;
  let bestLen = 0;
  const consider = (chain: NavigationItem[], path: string) => {
    if (path !== '/' && pathname.startsWith(`${path}/`) && path.length > bestLen) {
      best = chain;
      bestLen = path.length;
    }
  };
  for (const item of NAVIGATION_ITEMS) {
    consider([item], item.path);
    item.children?.forEach((c) => consider([item, c], c.path));
  }
  return best ?? [];
}

export function Breadcrumbs() {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();

  // Root page needs no breadcrumb trail.
  if (pathname === ROUTES.OVERVIEW) return null;

  const chain = resolveChain(pathname);
  if (chain.length === 0) return null;

  // Build crumbs: always start at Home, then each chain node. The final node is the
  // current page (no link). Group containers that aren't real routes render unlinked.
  const crumbs: Crumb[] = [{ label: 'overview', href: ROUTES.OVERVIEW }];
  chain.forEach((node, idx) => {
    const isLeaf = idx === chain.length - 1;
    const isGroupContainer = GROUP_CONTAINER_PATHS[node.path] === true && REAL_GROUP_ROUTES[node.path] !== true;
    crumbs.push({
      label: node.label,
      href: isLeaf || isGroupContainer ? undefined : node.path,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-3 sm:mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const isHome = idx === 0;
          return (
            <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-300" />}
              {crumb.href && !isLast ? (
                <Link
                  to={crumb.href}
                  className="flex items-center gap-1 rounded px-0.5 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {isHome && <Home aria-hidden className="h-3.5 w-3.5 shrink-0" />}
                  <span>{t(crumb.label)}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'flex items-center gap-1 font-medium text-gray-900' : 'flex items-center gap-1'}
                >
                  {isHome && <Home aria-hidden className="h-3.5 w-3.5 shrink-0" />}
                  <span>{t(crumb.label)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
