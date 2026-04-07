import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { NavigationTabsModule } from '@/components/modules/NavigationTabsModule';
import { RevenueChartModule } from '@/components/modules/RevenueChartModule';
import { StatCardModule } from '@/components/modules/StatCardModule';
import { TotalVisitModule } from '@/components/modules/TotalVisitModule';
import { ProductTableModule } from '@/components/modules/ProductTableModule';
import type { TabType } from '@/types';
import { revenueData, totalVisitData } from '@/data/mockData';
import './App.css';

// Module Showcase wrapper component
interface ModuleShowcaseProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ModuleShowcase({ title, description, children }: ModuleShowcaseProps) {
  return (
    <motion.div
      className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        {children}
      </div>
    </motion.div>
  );
}

// Individual module exports for cherry-picking
export { Sidebar } from '@/components/layout/Sidebar';
export { Header } from '@/components/layout/Header';
export { DashboardLayout } from '@/components/layout/DashboardLayout';
export { NavigationTabsModule } from '@/components/modules/NavigationTabsModule';
export { RevenueChartModule } from '@/components/modules/RevenueChartModule';
export { StatCardModule } from '@/components/modules/StatCardModule';
export { TotalVisitModule } from '@/components/modules/TotalVisitModule';
export { ProductTableModule } from '@/components/modules/ProductTableModule';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeSidebarItem, setActiveSidebarItem] = useState('dashboard');

  return (
    <DashboardLayout
      sidebarActiveItem={activeSidebarItem}
      onSidebarItemClick={setActiveSidebarItem}
      headerTitle="Dashboard"
    >
      {/* Navigation Tabs */}
      <NavigationTabsModule activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Grid */}
      <div className="space-y-6">
        {/* Revenue Chart */}
        <RevenueChartModule
          data={revenueData}
          totalRevenue="$75,490"
          changePercent={9}
        />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardModule
            title="Active Sales"
            value="$24,064"
            change={12}
            icon="clock"
            chartType="bar"
            delay={0}
          />
          <StatCardModule
            title="Product Sold"
            value="2,355"
            change={7}
            icon="package"
            chartType="donut"
            delay={0.1}
          />
          <StatCardModule
            title="Conversion Rate"
            value="12.5%"
            change={-2}
            icon="percent"
            chartType="line"
            delay={0.2}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TotalVisitModule
            total={totalVisitData.total}
            mobile={totalVisitData.mobile}
            desktop={totalVisitData.desktop}
            changePercent={totalVisitData.changePercent}
          />
          <ProductTableModule />
        </div>
      </div>

      {/* Module Showcase Section */}
      <motion.section
        className="mt-16 pt-8 border-t-2 border-dashed border-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Module Showcase</h2>
          <p className="text-sm text-gray-500">
            Each module displayed individually for review and nitpicking
          </p>
        </div>

        <div className="space-y-12">
          {/* NavigationTabsModule */}
          <ModuleShowcase
            title="NavigationTabsModule"
            description="Tab navigation with Overview, Sales, Order tabs and action buttons"
          >
            <NavigationTabsModule activeTab={activeTab} onTabChange={setActiveTab} />
          </ModuleShowcase>

          {/* RevenueChartModule */}
          <ModuleShowcase
            title="RevenueChartModule"
            description="Product revenue bar chart with Fashion/Electronics breakdown"
          >
            <RevenueChartModule
              data={revenueData}
              totalRevenue="$75,490"
              changePercent={9}
            />
          </ModuleShowcase>

          {/* StatCardModule - Active Sales */}
          <ModuleShowcase
            title="StatCardModule - Active Sales (Bar Chart)"
            description="Stat card with bar chart mini visualization"
          >
            <div className="max-w-sm">
              <StatCardModule
                title="Active Sales"
                value="$24,064"
                change={12}
                icon="clock"
                chartType="bar"
                delay={0}
              />
            </div>
          </ModuleShowcase>

          {/* StatCardModule - Product Sold */}
          <ModuleShowcase
            title="StatCardModule - Product Sold (Donut Chart)"
            description="Stat card with donut chart mini visualization"
          >
            <div className="max-w-sm">
              <StatCardModule
                title="Product Sold"
                value="2,355"
                change={7}
                icon="package"
                chartType="donut"
                delay={0}
              />
            </div>
          </ModuleShowcase>

          {/* StatCardModule - Conversion Rate */}
          <ModuleShowcase
            title="StatCardModule - Conversion Rate (Line Chart)"
            description="Stat card with line chart mini visualization"
          >
            <div className="max-w-sm">
              <StatCardModule
                title="Conversion Rate"
                value="12.5%"
                change={-2}
                icon="percent"
                chartType="line"
                delay={0}
              />
            </div>
          </ModuleShowcase>

          {/* TotalVisitModule */}
          <ModuleShowcase
            title="TotalVisitModule"
            description="Visit statistics with animated progress bar showing Mobile/Desktop breakdown"
          >
            <div className="max-w-lg">
              <TotalVisitModule
                total={totalVisitData.total}
                mobile={totalVisitData.mobile}
                desktop={totalVisitData.desktop}
                changePercent={totalVisitData.changePercent}
              />
            </div>
          </ModuleShowcase>

          {/* ProductTableModule */}
          <ModuleShowcase
            title="ProductTableModule"
            description="Product table with checkboxes, sales data, revenue, stock, and status badges"
          >
            <ProductTableModule />
          </ModuleShowcase>

          {/* Sidebar Module */}
          <ModuleShowcase
            title="Sidebar Module"
            description="Dark navigation sidebar with icons and active state indicator"
          >
            <div className="relative h-[500px] bg-gray-100 rounded-xl overflow-hidden">
              <div className="absolute left-0 top-0 h-full">
                <Sidebar activeItem={activeSidebarItem} onItemClick={setActiveSidebarItem} />
              </div>
              <div className="ml-[72px] p-4 text-sm text-gray-400">
                ← Sidebar appears here (fixed 72px width)
              </div>
            </div>
          </ModuleShowcase>

          {/* Header Module */}
          <ModuleShowcase
            title="Header Module"
            description="Page header with title, notification icons, avatars, and action button"
          >
            <Header title="Dashboard" />
          </ModuleShowcase>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="mt-12 pt-6 border-t border-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Orbit CRM Dashboard - Built with React + Tailwind CSS
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Modules:</span>
            <div className="flex gap-2">
              {[
                'Sidebar',
                'Header',
                'Tabs',
                'Chart',
                'Stats',
                'Visit',
                'Table',
              ].map((module) => (
                <span
                  key={module}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.footer>
    </DashboardLayout>
  );
}

export default App;
