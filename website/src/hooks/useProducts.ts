/**
 * useProducts Hook - Fetch product catalog from API
 * @crossref:used-in[ServiceForm, ServiceCatalog]
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchProducts, type ApiProduct } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  listPrice: number;
  salePrice: number | null;
  categoryId: string | null;
  categoryName: string | null;
  uomName: string | null;
  companyId: string | null;
  active: boolean;
}

interface UseProductsOptions {
  limit?: number;
  search?: string;
  categId?: string;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  totalItems: number;
}

function mapApiProduct(api: ApiProduct): Product {
  return {
    id: api.id,
    name: api.name,
    code: api.defaultcode,
    type: api.type,
    listPrice: parseFloat(api.listprice || '0') || 0,
    salePrice: api.saleprice ? parseFloat(api.saleprice) : null,
    categoryId: api.categid,
    categoryName: api.categname,
    uomName: api.uomname,
    companyId: api.companyid,
    active: api.active,
  };
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { limit = 1000, search, categId } = options;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchProducts({
        limit,
        search,
        categId,
      });
      
      setProducts(response.items.map(mapApiProduct));
      setTotalItems(response.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      console.error('[useProducts] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, search, categId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    products,
    isLoading,
    error,
    refetch,
    totalItems,
  };
}

export default useProducts;
