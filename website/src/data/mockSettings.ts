/**
 * Mock data for Settings and Configuration
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig, SystemPreferences]
 */

import type { AppointmentType } from '@/constants';

// --- Service Catalog ---

export interface CatalogService {
  readonly id: string;
  readonly name: string;
  readonly category: AppointmentType;
  readonly description: string;
  readonly price: number;
  readonly duration: number;
  readonly visits: number;
  readonly isActive: boolean;
}

export const MOCK_CATALOG_SERVICES: CatalogService[] = [
  { id: 'cat-1', name: 'Teeth Cleaning', category: 'cleaning', description: 'Professional dental cleaning and polish', price: 1_500_000, duration: 30, visits: 1, isActive: true },
  { id: 'cat-2', name: 'Teeth Whitening', category: 'cosmetic', description: 'In-office whitening treatment (3 sessions)', price: 6_000_000, duration: 60, visits: 3, isActive: true },
  { id: 'cat-3', name: 'Root Canal Treatment', category: 'treatment', description: 'Endodontic root canal therapy', price: 4_500_000, duration: 90, visits: 2, isActive: true },
  { id: 'cat-4', name: 'Dental Filling', category: 'treatment', description: 'Composite resin filling restoration', price: 1_200_000, duration: 45, visits: 1, isActive: true },
  { id: 'cat-5', name: 'Braces - Metal', category: 'orthodontics', description: 'Traditional metal braces full treatment', price: 25_000_000, duration: 30, visits: 18, isActive: true },
  { id: 'cat-6', name: 'Braces - Ceramic', category: 'orthodontics', description: 'Ceramic braces full treatment', price: 35_000_000, duration: 30, visits: 18, isActive: true },
  { id: 'cat-7', name: 'Wisdom Tooth Extraction', category: 'surgery', description: 'Surgical removal of wisdom tooth', price: 3_000_000, duration: 60, visits: 2, isActive: true },
  { id: 'cat-8', name: 'Dental Implant', category: 'surgery', description: 'Single tooth implant with crown', price: 18_000_000, duration: 60, visits: 5, isActive: true },
  { id: 'cat-9', name: 'Porcelain Veneer', category: 'cosmetic', description: 'Custom porcelain veneer per tooth', price: 8_000_000, duration: 60, visits: 3, isActive: true },
  { id: 'cat-10', name: 'General Consultation', category: 'consultation', description: 'Initial examination and treatment plan', price: 500_000, duration: 30, visits: 1, isActive: true },
  { id: 'cat-11', name: 'Emergency Toothache', category: 'emergency', description: 'Emergency pain relief and diagnosis', price: 800_000, duration: 30, visits: 1, isActive: true },
  { id: 'cat-12', name: 'Dental Crown', category: 'treatment', description: 'Full ceramic crown restoration', price: 5_500_000, duration: 60, visits: 2, isActive: true },
  { id: 'cat-13', name: 'Dental Bridge', category: 'treatment', description: '3-unit porcelain bridge', price: 12_000_000, duration: 60, visits: 3, isActive: false },
  { id: 'cat-14', name: 'Gum Treatment', category: 'treatment', description: 'Periodontal scaling and root planing', price: 2_000_000, duration: 45, visits: 2, isActive: false },
];

// --- Customer Sources ---

export interface CustomerSource {
  readonly id: string;
  readonly name: string;
  readonly type: 'online' | 'offline' | 'referral';
  readonly description: string;
  readonly isActive: boolean;
  readonly customerCount: number;
}

export const MOCK_CUSTOMER_SOURCES: CustomerSource[] = [
  { id: 'src-1', name: 'Sale Online', type: 'online', description: 'Khách đến từ kênh sale online', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'Khách vãng lai', type: 'offline', description: 'Khách đến trực tiếp không hẹn trước', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'Hotline', type: 'online', description: 'Khách gọi qua tổng đài', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'Khách cũ', type: 'offline', description: 'Khách hàng quay lại', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'Khách hàng giới thiệu', type: 'referral', description: 'Khách hàng hiện tại giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-6', name: 'Nội bộ giới thiệu', type: 'referral', description: 'Nhân viên nội bộ giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-7', name: 'MKT1', type: 'online', description: 'Kênh marketing 1', isActive: true, customerCount: 0 },
  { id: 'src-8', name: 'ĐNCB', type: 'offline', description: 'Đối nội cơ bản', isActive: true, customerCount: 0 },
];

// --- System Preferences ---

export interface SystemPreference {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly type: 'toggle' | 'select' | 'text' | 'number';
  readonly value: string | number | boolean;
  readonly options?: readonly string[];
  readonly group: string;
}

export const MOCK_SYSTEM_PREFERENCES: SystemPreference[] = [
  { key: 'clinic_name', label: 'Clinic Name', description: 'Display name for the clinic', type: 'text', value: 'TDental Clinic', group: 'General' },
  { key: 'default_language', label: 'Default Language', description: 'Primary language for the application', type: 'select', value: 'vi', options: ['vi', 'en'], group: 'General' },
  { key: 'currency', label: 'Currency', description: 'Currency for pricing and payments', type: 'select', value: 'VND', options: ['VND', 'USD'], group: 'General' },
  { key: 'appointment_duration', label: 'Default Appointment Duration (min)', description: 'Default time slot for new appointments', type: 'number', value: 30, group: 'Appointments' },
  { key: 'appointment_buffer', label: 'Buffer Between Appointments (min)', description: 'Gap between consecutive appointments', type: 'number', value: 10, group: 'Appointments' },
  { key: 'allow_online_booking', label: 'Allow Online Booking', description: 'Let customers book appointments online', type: 'toggle', value: true, group: 'Appointments' },
  { key: 'require_deposit', label: 'Require Deposit for Booking', description: 'Require a deposit when booking appointments', type: 'toggle', value: false, group: 'Appointments' },
  { key: 'sms_notifications', label: 'SMS Notifications', description: 'Send SMS reminders to patients', type: 'toggle', value: true, group: 'Notifications' },
  { key: 'email_notifications', label: 'Email Notifications', description: 'Send email reminders to patients', type: 'toggle', value: true, group: 'Notifications' },
  { key: 'reminder_hours', label: 'Reminder Lead Time (hours)', description: 'Hours before appointment to send reminder', type: 'number', value: 24, group: 'Notifications' },
  { key: 'auto_followup', label: 'Auto Follow-up Messages', description: 'Automatically send post-treatment follow-ups', type: 'toggle', value: false, group: 'Notifications' },
];
