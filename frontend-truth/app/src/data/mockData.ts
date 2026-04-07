import type { RevenueData, Product } from '@/types';

export const revenueData: RevenueData[] = [
  { month: 'Jan', fashion: 2400, electronics: 3200 },
  { month: 'Feb', fashion: 2800, electronics: 3500 },
  { month: 'Mar', fashion: 2200, electronics: 3000 },
  { month: 'Apr', fashion: 3200, electronics: 4100 },
  { month: 'May', fashion: 2166, electronics: 2644 },
  { month: 'Jun', fashion: 2900, electronics: 3800 },
  { month: 'Jul', fashion: 3100, electronics: 4200 },
  { month: 'Aug', fashion: 2800, electronics: 3900 },
  { month: 'Sept', fashion: 3300, electronics: 4500 },
  { month: 'Oct', fashion: 3600, electronics: 4800 },
  { month: 'Nov', fashion: 3400, electronics: 4600 },
  { month: 'Dec', fashion: 3800, electronics: 5200 },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Uxerflow T-Shirt #10',
    variant: 'White',
    sales: 4150,
    revenue: 5566.79,
    stock: 100,
    status: 'in-stock',
  },
  {
    id: '2',
    name: 'Uxerflow T-Shirt #10',
    variant: 'Black',
    sales: 3980,
    revenue: 4239.90,
    stock: 0,
    status: 'out-of-stock',
  },
  {
    id: '3',
    name: 'Uxerflow T-Shirt #19',
    variant: 'White',
    sales: 7100,
    revenue: 8560.25,
    stock: 20,
    status: 'restock',
  },
];

export const statCardsData = [
  {
    title: 'Active Sales',
    value: '$24,064',
    change: 12,
    chartType: 'bar' as const,
  },
  {
    title: 'Product Sold',
    value: '2,355',
    change: 7,
    chartType: 'donut' as const,
  },
  {
    title: 'Conversion Rate',
    value: '12.5%',
    change: -2,
    chartType: 'line' as const,
  },
];

export const totalVisitData = {
  total: 191886,
  mobile: 115132,
  desktop: 76754,
  changePercent: 8.5,
};
