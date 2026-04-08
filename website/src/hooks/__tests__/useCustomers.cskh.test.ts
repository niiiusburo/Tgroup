/**
 * TDD Tests for CSKH (Customer Service) Role Feature
 * Issue: Add CSKH role to link an employee to the customer
 * - Database: Add cskhid field to partners table
 * - API: Include cskhid in fetch/create/update partner
 * - UI: Add CSKH selector to AddCustomerForm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchPartners = vi.fn();
const mockCreatePartner = vi.fn();
const mockUpdatePartner = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchPartners: (...args: unknown[]) => mockFetchPartners(...args),
  createPartner: (...args: unknown[]) => mockCreatePartner(...args),
  updatePartner: (...args: unknown[]) => mockUpdatePartner(...args),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomers } from '../useCustomers';

describe('useCustomers - CSKH Role Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPartners.mockResolvedValue({
      items: [
        { 
          id: '1', 
          name: 'Nguyễn Văn A', 
          phone: '0901111111', 
          email: 'a@test.com', 
          companyid: 'c1', 
          status: true,
          cskhid: 'emp1',
          cskhname: 'CSKH Trâm',
        },
        { 
          id: '2', 
          name: 'Trần Thị B', 
          phone: '0902222222', 
          email: 'b@test.com', 
          companyid: 'c1', 
          status: true,
          cskhid: null,
          cskhname: null,
        },
      ],
      totalItems: 2,
    });
  });

  describe('RED: Tests should fail initially (feature not implemented)', () => {
    it('should include cskhid and cskhname in customer data', async () => {
      // When: Hook fetches customers
      const { result } = renderHook(() => useCustomers('all'));

      // Then: Should fetch customers with CSKH data
      await waitFor(() => {
        expect(result.current.customers).toHaveLength(2);
      });

      // And: First customer should have CSKH assigned
      const customerWithCSKH = result.current.customers[0];
      expect(customerWithCSKH).toHaveProperty('cskhid');
      expect(customerWithCSKH).toHaveProperty('cskhname');
      expect(customerWithCSKH.cskhid).toBe('emp1');
      expect(customerWithCSKH.cskhname).toBe('CSKH Trâm');

      // And: Second customer should have null CSKH
      const customerWithoutCSKH = result.current.customers[1];
      expect(customerWithoutCSKH.cskhid).toBeNull();
      expect(customerWithoutCSKH.cskhname).toBeNull();
    });

    it('should create customer with cskhid', async () => {
      // Given: Mock successful creation
      mockCreatePartner.mockResolvedValue({
        id: '3',
        name: 'Test Customer',
        phone: '0903333333',
        companyid: 'c1',
        status: true,
        cskhid: 'emp2',
        cskhname: 'CSKH Lan',
      });

      // When: Creating customer with CSKH
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newCustomer = await result.current.createCustomer({
        name: 'Test Customer',
        phone: '0903333333',
        companyid: 'c1',
        cskhid: 'emp2',
      } as CustomerFormData);

      // Then: Should call API with cskhid
      expect(mockCreatePartner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Customer',
          phone: '0903333333',
          cskhid: 'emp2',
        })
      );

      // And: Created customer should have CSKH data
      expect(newCustomer).toHaveProperty('cskhid', 'emp2');
    });

    it('should update customer with cskhid', async () => {
      // Given: Mock successful update
      mockUpdatePartner.mockResolvedValue({
        id: '1',
        name: 'Updated Name',
        cskhid: 'emp3',
      });

      // When: Updating customer with new CSKH
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateCustomer('1', {
        name: 'Updated Name',
        phone: '0901111111',
        cskhid: 'emp3',
      } as CustomerFormData);

      // Then: Should call API with cskhid
      expect(mockUpdatePartner).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Name',
          cskhid: 'emp3',
        })
      );
    });

    it('should allow removing cskh assignment by setting to empty string', async () => {
      // Given: Mock successful update
      mockUpdatePartner.mockResolvedValue({
        id: '1',
        name: 'Updated Name',
        cskhid: null,
      });

      // When: Removing CSKH assignment
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateCustomer('1', {
        name: 'Updated Name',
        phone: '0901111111',
        cskhid: '',
      } as CustomerFormData);

      // Then: Should call API with empty cskhid
      expect(mockUpdatePartner).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          cskhid: '',
        })
      );
    });
  });
});

// Type for test
type CustomerFormData = {
  name: string;
  phone: string;
  companyid?: string;
  cskhid?: string;
};
