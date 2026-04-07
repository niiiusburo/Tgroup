import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarCheck,
  Stethoscope,
  CreditCard,
  UserCog,
  MapPin,
  Settings,
  Percent,
  BarChart3,
  FolderOpen,
  Bell,
  Sparkles,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react';
import { NAVIGATION_ITEMS, type NavigationItem } from '@/constants';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarCheck,
  Stethoscope,
  CreditCard,
  UserCog,
  MapPin,
  Settings,
  Percent,
  BarChart3,
  BarChart2: BarChart3,
  FolderOpen,
  Shield,
};

/** Maps route path to the permission required to see it in the nav */
const NAV_PERMISSION: Record<string, string> = {
  '/': 'overview.view',
  '/calendar': 'calendar.view',
  '/customers': 'customers.view',
  '/appointments': 'appointments.view',
  '/services': 'services.view',
  '/payment': 'payment.view',
  '/employees': 'employees.view',
  '/locations': 'locations.view',
  '/reports': 'reports.view',
  '/commission': 'commission.view',
  '/settings': 'settings.view',
  '/notifications': 'notifications.view',
  '/permissions': 'employees.edit',
};

interface SidebarItemProps {
  item: NavigationItem;
  expanded: boolean;
  onClick?: () => void;
}

function SidebarItem({ item, expanded, onClick }: SidebarItemProps) {
  const Icon = ICON_MAP[item.icon];
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.children?.some((c) => c.path === location.pathname) ?? false);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={!expanded ? item.label : undefined}
      className={`
        relative h-11 flex items-center rounded-xl
        transition-colors duration-150 gap-3
        ${expanded ? 'px-3 w-full' : 'w-11 justify-center'}
        ${isActive
          ? 'text-primary bg-white/10'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-primary rounded-r-full" />
      )}
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      {expanded && (
        <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
          {item.label}
        </span>
      )}
      {expanded && item.count && (
        <span className="ml-auto text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
          {item.count}
        </span>
      )}
      {expanded && item.isPremium && (
        <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
          Pro
        </span>
      )}
    </NavLink>
  );
}

/**
 * Main application layout with icon-only dark sidebar navigation
 * Matches the original TDental design system
 * @crossref:uses[AuthContext, LocationContext, FilterByLocation]
 */
export function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { selectedLocationId, setSelectedLocationId, allowedLocations, isSingleLocation } = useLocationFilter();
  const { user, permissions, hasPermission, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = NAVIGATION_ITEMS.find(
    (item) =>
      item.path === location.pathname ||
      item.children?.some((c) => c.path === location.pathname)
  );
  const currentChild = NAVIGATION_ITEMS.flatMap((item) => item.children ?? []).find(
    (c) => c.path === location.pathname
  );
  const pageTitle = currentChild?.label ?? currentPage?.label ?? 'Dashboard';

  const sidebarWidth = sidebarExpanded ? 'w-56' : 'w-[72px]';
  const contentMargin = sidebarExpanded ? 'ml-56' : 'ml-[72px]';

  /** Filter nav items (and their children) by permission */
  function isNavItemVisible(item: NavigationItem): boolean {
    // If no permissions data yet, show everything (fallback to unrestricted)
    if (!permissions) return true;
    const required = NAV_PERMISSION[item.path];
    if (!required) return true;
    return hasPermission(required);
  }

  const visibleNavItems = NAVIGATION_ITEMS.filter(isNavItemVisible).map((item) => ({
    ...item,
    children: item.children?.filter(isNavItemVisible),
  }));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // User initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Collapsible sidebar */}
      <aside className={`fixed left-0 top-0 h-full ${sidebarWidth} bg-sidebar flex flex-col py-4 z-50 transition-all duration-300 ease-in-out`}>
        {/* Logo + Toggle */}
        <div className={`flex items-center mb-8 flex-shrink-0 ${sidebarExpanded ? 'px-4 justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            {sidebarExpanded && (
              <span className="text-white font-semibold text-lg whitespace-nowrap">TDental</span>
            )}
          </div>
          {sidebarExpanded && (
            <button
              onClick={() => setSidebarExpanded(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 flex flex-col gap-1 w-full ${sidebarExpanded ? 'px-3' : 'px-3 items-center'}`}>
          {visibleNavItems.map((item) => (
            <SidebarItem key={item.path} item={item} expanded={sidebarExpanded} />
          ))}
        </nav>

        {/* Bottom: user info + logout */}
        <div className={`flex flex-col gap-3 mt-4 ${sidebarExpanded ? 'px-3' : 'items-center'}`}>
          {sidebarExpanded ? (
            <>
              {/* User info row */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-primary font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{permissions?.groupName ?? ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setSidebarExpanded(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {/* Avatar with logout on click-hold — keep simple: avatar opens expand */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-red-500/20 transition-colors"
              >
                <span className="text-xs text-primary font-semibold">{initials}</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <div className="w-3 h-3 rounded-full bg-pink-500" />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`${contentMargin} min-h-screen flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-4">
            {/* Location Filter — hidden when user is locked to a single location */}
            {!isSingleLocation && (
              <FilterByLocation
                locations={allowedLocations.length > 0 ? allowedLocations : MOCK_LOCATIONS}
                selectedId={selectedLocationId}
                onChange={setSelectedLocationId}
              />
            )}

            {/* Sparkles */}
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150">
              <Sparkles className="w-5 h-5 text-gray-500" />
            </button>

            {/* Bell */}
            <button className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Avatars */}
            <div className="flex -space-x-2">
              {[
                { name: 'JD', color: 'bg-blue-500' },
                { name: 'AS', color: 'bg-green-500' },
                { name: 'MK', color: 'bg-purple-500' },
              ].map((avatar) => (
                <div
                  key={avatar.name}
                  className={`w-8 h-8 rounded-full border-2 border-white ${avatar.color} flex items-center justify-center`}
                >
                  <span className="text-xs text-white font-medium">{avatar.name}</span>
                </div>
              ))}
            </div>

            {/* Customize Widget */}
            <button className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors duration-150">
              <LayoutGrid className="w-4 h-4" />
              Customize Widget
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
