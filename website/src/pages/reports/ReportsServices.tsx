import { useOutletContext } from 'react-router-dom';
import { FolderOpen, Package, DollarSign, Tag } from 'lucide-react';
import { useReportData, formatVND, formatNum } from '@/hooks/useReportData';
import { KPICard } from '@/components/reports/KPICard';
import { HorizontalBarList } from '@/components/reports/BarChart';
import { SectionCard, ExportCSVButton } from '@/components/reports/ReportsFilters';
import { ReportError } from '@/components/reports/ReportError';

interface SvcData {
  categories: { category: string; productCount: number; avgPrice: number }[];
  revenueByCategory: { category: string; orderCount: number; revenue: number }[];
  popularProducts: { name: string; category: string; price: number; orderCount: number }[];
}

export function ReportsServices() {
  const filters = useOutletContext<{ dateFrom: string; dateTo: string; companyId: string }>();
  const { data, loading, error, refetch } = useReportData<SvcData>('/Reports/services/breakdown', filters);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading services…</div>;
  if (error) return <ReportError error={error} onRetry={refetch} />;
  if (!data) return <div className="text-center py-12 text-gray-400">No data available</div>;

  const totalProducts = data.categories.reduce((s, c) => s + c.productCount, 0);
  const totalRev = data.revenueByCategory.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Categories" value={data.categories.length} format="number" icon={<Tag className="w-4 h-4" />} color="blue" delay={0} />
        <KPICard label="Active Products" value={totalProducts} format="number" icon={<Package className="w-4 h-4" />} color="emerald" delay={1} />
        <KPICard label="Service Revenue" value={totalRev} format="currency" icon={<DollarSign className="w-4 h-4" />} color="violet" delay={2} />
        <KPICard label="Avg Price" value={data.categories.length > 0 ? data.categories.reduce((s, c) => s + c.avgPrice, 0) / data.categories.length : 0} format="currency" icon={<FolderOpen className="w-4 h-4" />} color="orange" delay={3} />
      </div>

      {/* Revenue by category */}
      <SectionCard
        title="Revenue by Service Category"
        action={<ExportCSVButton data={data.revenueByCategory.map(c => ({ Category: c.category, Orders: c.orderCount, Revenue: c.revenue }))} filename="service-categories" />}
      >
        <HorizontalBarList
          items={data.revenueByCategory.filter(c => c.revenue > 0).map(c => ({ label: c.category, value: c.revenue }))}
          formatValue={formatVND}
          color="bg-violet-500"
        />
      </SectionCard>

      {/* Product catalog overview */}
      <SectionCard
        title="Product Catalog by Category"
        action={<ExportCSVButton data={data.categories.map(c => ({ Category: c.category, Products: c.productCount, AvgPrice: c.avgPrice }))} filename="product-catalog" />}
      >
        <HorizontalBarList
          items={data.categories.map(c => ({ label: c.category, value: c.productCount }))}
          formatValue={formatNum}
          color="bg-blue-500"
        />
      </SectionCard>

      {/* Popular products */}
      {data.popularProducts.length > 0 && (
        <SectionCard title="Popular Products">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-3 px-3 text-gray-500 font-medium">Price</th>
                  <th className="text-right py-3 px-3 text-gray-500 font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {data.popularProducts.filter(p => p.orderCount > 0).map((prod) => (
                  <tr key={prod.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="py-3 px-3 font-medium text-gray-900">{prod.name}</td>
                    <td className="py-3 px-3 text-gray-500">{prod.category || '—'}</td>
                    <td className="py-3 px-3 text-right">{formatVND(prod.price)}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatNum(prod.orderCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
