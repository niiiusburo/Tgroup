import type { EmployeePermission } from '@/lib/api';

export const MODULES = [
  { name: 'Overview', actions: ['View'] },
  { name: 'Calendar', actions: ['View', 'Edit'] },
  { name: 'Customers', actions: ['View', 'View All', 'Add', 'Edit', 'Delete', 'Hard Delete'] },
  { name: 'Appointments', actions: ['View', 'Add', 'Edit'] },
  { name: 'Services', actions: ['View', 'Add', 'Edit'] },
  { name: 'Payment', actions: ['View', 'Add', 'Refund'] },
  { name: 'Employees', actions: ['View', 'Add', 'Edit'] },
  { name: 'Locations', actions: ['View', 'Add', 'Edit'] },
  { name: 'Reports', actions: ['View', 'Export'] },
  { name: 'Commission', actions: ['View', 'Edit'] },
  { name: 'Settings', actions: ['View', 'Edit'] },
  { name: 'Notifications', actions: ['View', 'Edit'] },
  { name: 'Permissions', actions: ['View', 'Edit'] },
  { name: 'Relationships', actions: ['View'] },
  { name: 'Website', actions: ['View', 'Edit'] },
  { name: 'External Checkups', actions: ['View', 'Create'] },
] as const;

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'overview.view': 'Xem trang tổng quan Dashboard',
  'calendar.view': 'Xem lịch hẹn trên Calendar',
  'calendar.edit': 'Chỉnh sửa, kéo thả lịch hẹn',
  'customers.view': 'Xem danh sách khách hàng',
  'customers.view_all': 'Xem tất cả khách hàng không cần tìm kiếm — tự động hiển thị toàn bộ danh sách',
  'customers.add': 'Thêm khách hàng mới',
  'customers.edit': 'Chỉnh sửa thông tin khách hàng',
  'customers.delete': 'Xóa khách hàng',
  'appointments.view': 'Xem danh sách lịch hẹn',
  'appointments.add': 'Tạo lịch hẹn mới',
  'appointments.edit': 'Chỉnh sửa lịch hẹn',
  'employees.view': 'Xem danh sách nhân viên',
  'employees.add': 'Thêm nhân viên mới',
  'employees.edit': 'Chỉnh sửa thông tin nhân viên',
  'locations.view': 'Xem danh sách chi nhánh',
  'locations.add': 'Thêm chi nhánh mới',
  'locations.edit': 'Chỉnh sửa thông tin chi nhánh',
  'services.view': 'Xem danh mục dịch vụ',
  'services.add': 'Thêm dịch vụ mới',
  'services.edit': 'Chỉnh sửa dịch vụ',
  'payment.view': 'Xem lịch sử thanh toán',
  'payment.add': 'Tạo thanh toán mới',
  'payment.refund': 'Hoàn tiền thanh toán',
  'reports.view': 'Xem báo cáo',
  'reports.export': 'Xuất báo cáo',
  'settings.view': 'Xem cài đặt hệ thống',
  'settings.edit': 'Chỉnh sửa cài đặt',
  'notifications.view': 'Xem thông báo',
  'notifications.edit': 'Quản lý thông báo',
  'commission.view': 'Xem hoa hồng',
  'commission.edit': 'Chỉnh sửa hoa hồng',
  'permissions.view': 'Xem quyền hệ thống',
  'permissions.edit': 'Chỉnh sửa quyền hệ thống',
  'relationships.view': 'Xem mối quan hệ dữ liệu',
  'website.view': 'Xem trang website',
  'website.edit': 'Chỉnh sửa trang website',
  'external_checkups.view': 'Xem ảnh khám ngoài',
  'external_checkups.create': 'Tải lên ảnh khám ngoài',
  'customers.hard_delete': 'Xóa vĩnh viễn khách hàng khỏi hệ thống',
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function getRoleLabel(emp: EmployeePermission): string {
  return emp.groupName || 'Unassigned';
}
