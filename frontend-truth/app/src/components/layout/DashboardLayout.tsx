import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { staggerContainer } from '@/lib/animation';

export interface DashboardLayoutProps {
  children: ReactNode;
  sidebarActiveItem?: string;
  headerTitle?: string;
  onSidebarItemClick?: (item: string) => void;
}

export function DashboardLayout({
  children,
  sidebarActiveItem = 'dashboard',
  headerTitle = 'Dashboard',
  onSidebarItemClick,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar activeItem={sidebarActiveItem} onItemClick={onSidebarItemClick} />

      {/* Main Content */}
      <div className="ml-[72px] min-h-screen flex flex-col">
        {/* Header */}
        <Header title={headerTitle} />

        {/* Page Content */}
        <motion.main
          className="flex-1 p-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export default DashboardLayout;
