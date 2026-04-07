import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Product, ProductStatus } from '@/types';
import { fadeInUp } from '@/lib/animation';

export interface ProductTableModuleProps {
  products?: Product[];
  title?: string;
}

const defaultProducts: Product[] = [
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
    revenue: 4239.9,
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

const statusConfig: Record<
  ProductStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  'in-stock': {
    label: 'In Stock',
    variant: 'default',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  'out-of-stock': {
    label: 'Out of Stock',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
  restock: {
    label: 'Restock',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  },
};

export function ProductTableModule({
  products = defaultProducts,
  title = 'Top Product',
}: ProductTableModuleProps) {
  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-card"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
      whileHover={{
        scale: 1.005,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-500">?</span>
          </div>
        </div>
        <motion.button
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-150 group"
          whileHover={{ x: 2 }}
        >
          All Product
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </motion.button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-10 pb-3">
                <Checkbox className="border-gray-300" />
              </th>
              <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sales
              </th>
              <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <motion.tr
                key={product.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-150"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + index * 0.05,
                  duration: 0.2,
                }}
              >
                <td className="py-4">
                  <Checkbox className="border-gray-300" />
                </td>
                <td className="py-4">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.variant}</p>
                  </div>
                </td>
                <td className="py-4">
                  <span className="text-sm text-gray-700">
                    {product.sales.toLocaleString()} pcs
                  </span>
                </td>
                <td className="py-4">
                  <span className="text-sm font-medium text-gray-900">
                    ${product.revenue.toLocaleString()}
                  </span>
                </td>
                <td className="py-4">
                  <span className="text-sm text-gray-700">{product.stock}</span>
                </td>
                <td className="py-4">
                  <Badge
                    variant={statusConfig[product.status].variant}
                    className={`text-xs font-medium ${statusConfig[product.status].className}`}
                  >
                    {statusConfig[product.status].label}
                  </Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default ProductTableModule;
