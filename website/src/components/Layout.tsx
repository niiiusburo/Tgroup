import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PermissionDebugger } from '@/components/debug/PermissionDebugger';
import { VersionDisplay } from '@/components/shared/VersionDisplay';
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
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Lock } from
'lucide-react';
import { NAVIGATION_ITEMS, ROUTE_PERMISSIONS, type NavigationItem } from '@/constants';
import { FilterByLocation } from '@/components/shared/FilterByLocation';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/useLocations';
import { FeedbackWidget } from '@/components/shared/FeedbackWidget';
import { GlobalFaceIdButton } from '@/components/shared/GlobalFaceIdButton';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { ChangePasswordModal } from '@/components/shared/ChangePasswordModal';
import { useTranslation } from 'react-i18next';


const ICON_MAP: Record<string, React.ComponentType<{className?: string;}>> = {
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
  Bell,
  MessageSquare
};

interface SidebarItemProps {
  item: NavigationItem;
  expanded: boolean;
  mobileMenuOpen?: boolean;
  onClick?: () => void;
}

function SidebarItem({ item, expanded, mobileMenuOpen, onClick }: SidebarItemProps) {
  const { t } = useTranslation('nav');
  const Icon = ICON_MAP[item.icon];
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleHide() {
    hideTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  function cancelHide() {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    setOpen(false);
    cancelHide();

    return cancelHide;
  }, [location.pathname, mobileMenuOpen]);

  const isActive =
  location.pathname === item.path || (
  item.children?.some((c) => c.path === location.pathname) ?? false);

  const hasChildren = (item.children?.length ?? 0) > 0;

  if (!hasChildren) {
    return (
      <NavLink
        to={item.path}
        onClick={onClick}
        title={!expanded ? t(item.label) : undefined}
        className={`
          relative h-11 flex items-center rounded-xl
          nav-smooth gap-3
          ${expanded ? 'px-3 w-full' : 'w-11 justify-center'}
          ${isActive ?
        'text-primary bg-white/10' :
        'text-gray-400 hover:text-white hover:bg-white/8'}
        `
        }>
        
        {isActive &&
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-primary rounded-r-full" />
        }
        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
        {expanded &&
        <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
            {t(item.label)}
          </span>
        }
        {expanded && item.count &&
        <span className="ml-auto text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
            {item.count}
          </span>
        }
        {expanded && item.isPremium &&
        <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
            Pro
          </span>
        }
      </NavLink>);

  }

  return (
    <div
      className="relative"
      onMouseEnter={mobileMenuOpen ? undefined : () => {cancelHide();setOpen(true);}}
      onMouseLeave={mobileMenuOpen ? undefined : scheduleHide}>
      
      <button
        type="button"
        onClick={() => setOpen(mobileMenuOpen ? (prev) => !prev : true)}
        title={!expanded ? t(item.label) : undefined}
        className={`
          relative h-11 flex items-center rounded-xl
          nav-smooth gap-3
          ${expanded ? 'px-3 w-full' : 'w-11 justify-center'}
          ${isActive ?
        'text-primary bg-white/10' :
        'text-gray-400 hover:text-white hover:bg-white/8'}
        `
        }>
        
        {isActive &&
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-primary rounded-r-full" />
        }
        {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
        {expanded &&
        <>
            <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left">
              {t(item.label)}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </>
        }
      </button>

      <div
        className={`
          transition-all duration-200 ease-out
          ${mobileMenuOpen
            ? 'relative w-full mt-1 pl-3 border-l border-white/10'
            : 'absolute z-50 left-full top-0 ml-2'
          }
          ${open ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}
          ${mobileMenuOpen && !open ? 'max-h-0 overflow-hidden' : ''}
          ${mobileMenuOpen && open ? 'max-h-96' : ''}
        `}
        onMouseEnter={mobileMenuOpen ? undefined : cancelHide}
        onMouseLeave={mobileMenuOpen ? undefined : scheduleHide}>
        
        <div className="bg-sidebar border border-white/10 rounded-xl shadow-lg p-2 min-w-[180px]">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            {t(item.label)}
          </div>
          <div className="flex flex-col gap-1">
            {item.children!.map((child) => {
              const ChildIcon = ICON_MAP[child.icon];
              const childActive = location.pathname === child.path;
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={onClick}
                  className={`
                    flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                    ${childActive ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/8'}
                  `}>
                  
                  {ChildIcon && <ChildIcon className="w-4 h-4 flex-shrink-0" />}
                  <span className="flex-1 whitespace-nowrap">{t(child.label)}</span>
                  {child.count &&
                  <span className="text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
                      {child.count}
                    </span>
                  }
                  {child.isPremium &&
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                      Pro
                    </span>
                  }
                </NavLink>);

            })}
          </div>
        </div>
      </div>
    </div>);

}

/**
 * Main application layout with icon-only dark sidebar navigation
 * Matches the original TG Clinic design system
 * @crossref:uses[AuthContext, LocationContext, FilterByLocation]
 */
export function Layout() {
  const { t } = useTranslation('nav');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { selectedLocationId, setSelectedLocationId, allowedLocations, isSingleLocation } = useLocationFilter();
  const { user, permissions, hasPermission, logout } = useAuth();
  const { allLocations: allApiLocations } = useLocations();
  const locationsForFilter = allowedLocations.length > 0 ? allowedLocations : allApiLocations;
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcut for permission debugger (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentPage = NAVIGATION_ITEMS.find(
    (item) =>
    item.path === location.pathname ||
    item.children?.some((c) => c.path === location.pathname)
  );
  const currentChild = NAVIGATION_ITEMS.flatMap((item) => item.children ?? []).find(
    (c) => c.path === location.pathname
  );
  const pageTitle = t(currentChild?.label ?? currentPage?.label ?? 'Dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  /** Filter nav items (and their children) by permission */
  function isNavItemVisible(item: NavigationItem): boolean {
    // If no permissions data yet, show everything (fallback to unrestricted)
    if (!permissions) return true;
    const required = ROUTE_PERMISSIONS[item.path];
    if (!required) return true;
    return hasPermission(required);
  }

  const visibleNavItems = NAVIGATION_ITEMS.filter(isNavItemVisible).map((item) => ({
    ...item,
    children: item.children?.filter(isNavItemVisible)
  }));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // User initials for avatar
  const initials = user?.name ?
  user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() :
  '?';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tablet/mobile overlay */}
      {mobileMenuOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
        onClick={() => setMobileMenuOpen(false)} />

      }

      {/* Collapsible sidebar - drawer on phones/tablets, fixed on desktop */}
      <aside
        className={`
          fixed left-0 top-0 h-full bg-sidebar flex flex-col py-4 transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 w-[18rem] max-w-[86vw] z-[60]' : '-translate-x-full w-[18rem] max-w-[86vw] lg:translate-x-0 z-40'}
          ${!mobileMenuOpen && sidebarExpanded ? 'lg:w-56' : ''}
          ${!mobileMenuOpen && !sidebarExpanded ? 'lg:w-[72px]' : ''}
        `}>
        
        {/* Logo + Toggle */}
        <div className={`flex items-center mb-8 flex-shrink-0 ${mobileMenuOpen || sidebarExpanded ? 'px-4 justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            {(mobileMenuOpen || sidebarExpanded) &&
            <span className="text-white font-semibold text-lg whitespace-nowrap">{t('app.name', { ns: 'common' })}</span>
            }
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden">
            
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse button */}
          {sidebarExpanded &&
          <button
            onClick={() => setSidebarExpanded(false)}
            className="hidden lg:flex w-10 h-10 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            
              <ChevronLeft className="w-4 h-4" />
            </button>
          }
        </div>

        {/* Navigation */}
        <nav className={`flex-1 flex flex-col gap-1 w-full ${mobileMenuOpen ? 'overflow-y-auto' : ''} ${sidebarExpanded || mobileMenuOpen ? 'px-3' : 'px-3 items-center'}`}>
          {visibleNavItems.map((item) =>
          <SidebarItem
            key={item.path}
            item={item}
            expanded={sidebarExpanded || mobileMenuOpen}
            mobileMenuOpen={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(false)}
          />
          )}
        </nav>

        {/* Bottom: user info + logout */}
        <div className={`flex flex-col gap-3 mt-4 ${mobileMenuOpen || sidebarExpanded ? 'px-3' : 'items-center'}`}>
          {mobileMenuOpen || sidebarExpanded ?
          <>
              {/* User info row */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-primary font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name ?? ''}</p>
                  <p className="text-xs text-gray-400 truncate">{permissions?.groupName ?? ''}</p>
                </div>
                <button
                onClick={() => setChangePasswordOpen(true)}
                title={t('changePassword')}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
                
                  <Lock className="w-4 h-4" />
                </button>
                <button
                onClick={handleLogout}
                title={t('logout')}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0">
                
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </> :

          <>
              <button
              onClick={() => setSidebarExpanded(true)}
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              
                <ChevronRight className="w-5 h-5" />
              </button>
              {/* Avatar with logout on click-hold — keep simple: avatar opens expand */}
              <button
              onClick={handleLogout}
              title={t('logout')}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-red-500/20 transition-colors">
              
                <span className="text-xs text-primary font-semibold">{initials}</span>
              </button>
            </>
          }

          <div className="flex items-center gap-2 justify-center">
            <LanguageToggle compact={!sidebarExpanded} />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={`
          min-h-screen flex flex-col transition-all duration-300 ease-in-out
          w-full max-w-full md:w-auto
          ml-0
          ${sidebarExpanded ? 'lg:ml-56' : 'lg:ml-[72px]'}
        `}>
        
        {/* Header */}
        <header className="min-h-16 bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 md:px-5 lg:px-6 sticky top-0 z-50">
          {/* Mobile menu button + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 tracking-tight leading-snug">
              {pageTitle}
            </h1>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3 lg:gap-4">
            {/* Location Filter — hidden when user is locked to a single location */}
            {!isSingleLocation &&
            <div className="hidden sm:block">
                <FilterByLocation
                locations={locationsForFilter}
                selectedId={selectedLocationId}
                onChange={setSelectedLocationId} />

              </div>
            }

            {/* Quick Face ID — opens FaceCaptureModal, navigates to matched customer */}
            <GlobalFaceIdButton />

            {/* Feedback */}
            <FeedbackWidget />

            {/* Bell */}
            <button className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 relative z-0 overflow-x-hidden tablet-flow">
          <Outlet />
        </main>

        {/* Version Display */}
        <div className="fixed bottom-4 right-4 z-40 hidden sm:block">
          <VersionDisplay variant="floating" />
        </div>
      </div>

      {/* Permission Debugger Modal */}
      <PermissionDebugger isOpen={debugOpen} onClose={() => setDebugOpen(false)} />

      {/* Change Password Modal */}
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>);

}
