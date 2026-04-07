/**
 * Mock data for Customer selectors and forms
 * @crossref:used-in[CustomerSelector, CustomerForm, AppointmentForm]
 */

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
}

export const MOCK_CUSTOMERS: readonly Customer[] = [
  { id: 'cust-1', name: 'Nguyen Van A', phone: '0901-111-222', email: 'a.nguyen@email.com', locationId: 'loc-1' },
  { id: 'cust-2', name: 'Tran Thi B', phone: '0912-222-333', email: 'b.tran@email.com', locationId: 'loc-1' },
  { id: 'cust-3', name: 'Le Van C', phone: '0923-333-444', email: 'c.le@email.com', locationId: 'loc-2' },
  { id: 'cust-4', name: 'Pham Thi D', phone: '0934-444-555', email: 'd.pham@email.com', locationId: 'loc-2' },
  { id: 'cust-5', name: 'Hoang Van E', phone: '0945-555-666', email: 'e.hoang@email.com', locationId: 'loc-3' },
  { id: 'cust-6', name: 'Vo Thi F', phone: '0956-666-777', email: 'f.vo@email.com', locationId: 'loc-1' },
  { id: 'cust-7', name: 'Dao Quoc G', phone: '0967-777-888', email: 'g.dao@email.com', locationId: 'loc-3' },
  { id: 'cust-8', name: 'Bui Thi H', phone: '0978-888-999', email: 'h.bui@email.com', locationId: 'loc-4' },
] as const;
