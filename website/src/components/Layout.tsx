import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { NAVIGATION_ITEMS, type NavigationItem } from '@/constants';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { useLocationFilter } from '@/contexts/LocationContext';
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
};

interface SidebarItemProps {
  item: NavigationItem;
  onClick?: () => void;
}

function SidebarItem({ item, onClick }: SidebarItemProps) {
  const Icon = ICON_MAP[item.icon];
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.children?.some((c) => c.path === location.pathname) ?? false);

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={item.label}
      className={`
        relative w-12 h-12 flex items-center justify-center rounded-xl
        transition-colors duration-150
        ${isActive
          ? 'text-primary'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
      {Icon && <Icon className="w-5 h-5" />}
    </NavLink>
  );
}

/**
 * Main application layout with icon-only dark sidebar navigation
 * Matches the original TDental design system
 */
export function Layout() {
  const { selectedLocationId, setSelectedLocationId } = useLocationFilter();
  const location = useLocation();

  const currentPage = NAVIGATION_ITEMS.find(
    (item) =>
      item.path === location.pathname ||
      item.children?.some((c) => c.path === location.pathname)
  );
  const currentChild = NAVIGATION_ITEMS.flatMap((item) => item.children ?? []).find(
    (c) => c.path === location.pathname
  );
  const pageTitle = currentChild?.label ?? currentPage?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed icon-only sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[72px] bg-sidebar flex flex-col items-center py-4 z-50">
        {/* Logo */}
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-8 flex-shrink-0">
          <span className="text-white font-bold text-sm">TD</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2 w-full px-3">
          {NAVIGATION_ITEMS.map((item) => (
            <SidebarItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Bottom indicators */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <div className="w-3 h-3 rounded-full bg-pink-500" />
        </div>
      </aside>

      {/* Main content area */}
      <div className="ml-[72px] min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-4">
            {/* Location Filter */}
            <FilterByLocation
              locations={MOCK_LOCATIONS}
              selectedId={selectedLocationId}
              onChange={setSelectedLocationId}
            />

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
