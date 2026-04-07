// Revenue Chart Types
export interface RevenueData {
  month: string;
  fashion: number;
  electronics: number;
}

// Stat Card Types
export interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  chartType: 'bar' | 'donut' | 'line';
}

// Total Visit Types
export interface TotalVisitProps {
  total: number;
  mobile: number;
  desktop: number;
  changePercent: number;
}

// Product Types
export type ProductStatus = 'in-stock' | 'out-of-stock' | 'restock';

export interface Product {
  id: string;
  name: string;
  variant: string;
  sales: number;
  revenue: number;
  stock: number;
  status: ProductStatus;
}

// Navigation Types
export type TabType = 'overview' | 'sales' | 'order';

// Sidebar Types
export interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}
