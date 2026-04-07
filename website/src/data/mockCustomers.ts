/**
 * Mock data for Customer list, selectors, and forms
 * @crossref:used-in[CustomerSelector, CustomerForm, AppointmentForm, useCustomers]
 */

export type CustomerStatus = 'active' | 'inactive' | 'pending';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
  readonly status: CustomerStatus;
  readonly lastVisit: string;
}

export const MOCK_CUSTOMERS: readonly Customer[] = [
  { id: 'cust-1', name: 'Nguyen Van An', phone: '0901-111-222', email: 'an.nguyen@email.com', locationId: 'loc-1', status: 'active', lastVisit: '2026-04-01' },
  { id: 'cust-2', name: 'Tran Thi Bich', phone: '0912-222-333', email: 'bich.tran@email.com', locationId: 'loc-1', status: 'active', lastVisit: '2026-03-28' },
  { id: 'cust-3', name: 'Le Van Cuong', phone: '0923-333-444', email: 'cuong.le@email.com', locationId: 'loc-2', status: 'active', lastVisit: '2026-03-15' },
  { id: 'cust-4', name: 'Pham Thi Dao', phone: '0934-444-555', email: 'dao.pham@email.com', locationId: 'loc-2', status: 'inactive', lastVisit: '2025-12-10' },
  { id: 'cust-5', name: 'Hoang Van Em', phone: '0945-555-666', email: 'em.hoang@email.com', locationId: 'loc-3', status: 'active', lastVisit: '2026-04-05' },
  { id: 'cust-6', name: 'Vo Thi Fang', phone: '0956-666-777', email: 'fang.vo@email.com', locationId: 'loc-1', status: 'pending', lastVisit: '2026-03-20' },
  { id: 'cust-7', name: 'Dao Quoc Gia', phone: '0967-777-888', email: 'gia.dao@email.com', locationId: 'loc-3', status: 'active', lastVisit: '2026-04-03' },
  { id: 'cust-8', name: 'Bui Thi Hanh', phone: '0978-888-999', email: 'hanh.bui@email.com', locationId: 'loc-4', status: 'active', lastVisit: '2026-03-30' },
  { id: 'cust-9', name: 'Ly Minh Hung', phone: '0903-123-456', email: 'hung.ly@email.com', locationId: 'loc-1', status: 'active', lastVisit: '2026-04-06' },
  { id: 'cust-10', name: 'Dang Thi Kim', phone: '0914-234-567', email: 'kim.dang@email.com', locationId: 'loc-2', status: 'inactive', lastVisit: '2025-11-22' },
  { id: 'cust-11', name: 'Ngo Van Lam', phone: '0925-345-678', email: 'lam.ngo@email.com', locationId: 'loc-3', status: 'active', lastVisit: '2026-03-25' },
  { id: 'cust-12', name: 'Truong Thi Mai', phone: '0936-456-789', email: 'mai.truong@email.com', locationId: 'loc-4', status: 'pending', lastVisit: '2026-04-02' },
  { id: 'cust-13', name: 'Do Thanh Nam', phone: '0947-567-890', email: 'nam.do@email.com', locationId: 'loc-1', status: 'active', lastVisit: '2026-03-18' },
  { id: 'cust-14', name: 'Huynh Thi Oanh', phone: '0958-678-901', email: 'oanh.huynh@email.com', locationId: 'loc-2', status: 'active', lastVisit: '2026-04-04' },
  { id: 'cust-15', name: 'Vu Quang Phuc', phone: '0969-789-012', email: 'phuc.vu@email.com', locationId: 'loc-4', status: 'active', lastVisit: '2026-03-12' },
] as const;
