import { motion } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Users,
  CheckSquare,
  Settings,
  BarChart3,
  Mail,
  FolderOpen,
} from 'lucide-react';
import { slideInLeft } from '@/lib/animation';

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon: Icon, active, onClick }: SidebarItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative w-12 h-12 flex items-center justify-center rounded-xl transition-colors duration-150 ${
        active
          ? 'text-primary'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}

export interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

export function Sidebar({ activeItem = 'dashboard', onItemClick }: SidebarProps) {
  const menuItems = [
    { id: 'search', icon: Search },
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'calendar', icon: Calendar },
    { id: 'messages', icon: MessageSquare },
    { id: 'contacts', icon: Users },
    { id: 'tasks', icon: CheckSquare },
    { id: 'analytics', icon: BarChart3 },
    { id: 'mail', icon: Mail },
    { id: 'files', icon: FolderOpen },
    { id: 'settings', icon: Settings },
  ];

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full w-[72px] bg-sidebar flex flex-col items-center py-4 z-50"
      initial={slideInLeft.initial}
      animate={slideInLeft.animate}
      transition={slideInLeft.transition}
    >
      {/* Logo */}
      <motion.div
        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-8"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sidebar font-bold text-lg">W</span>
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.2,
            }}
          >
            <SidebarItem
              icon={item.icon}
              active={activeItem === item.id}
              onClick={() => onItemClick?.(item.id)}
            />
          </motion.div>
        ))}
      </nav>

      {/* Bottom Indicators */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <motion.div
          className="w-3 h-3 rounded-full bg-purple-500"
          whileHover={{ scale: 1.2 }}
        />
        <motion.div
          className="w-3 h-3 rounded-full bg-pink-500"
          whileHover={{ scale: 1.2 }}
        />
      </div>
    </motion.aside>
  );
}

export default Sidebar;
