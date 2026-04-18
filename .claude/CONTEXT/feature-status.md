# What's Connected vs Mock

## Connected to real DB
- Customer list, search, create, profile view
- Appointment list, search, create, calendar views
- Employee/doctor list with location filter
- Dashboard stats (patient count, appointment count)
- Revenue chart (real appointment counts by month)
- Location list and global location filter on all 7 pages
- FilterByDoctor uses real doctors from API

## Still using mock data (no DB tables)
- Customer photos, deposits, service history
- Payment wallets and installment plans
- Service Catalog (Products table missing)
- Settings (all 4 tabs)
- Relationships / Permission matrix
- Commission, Reports, Notifications (placeholder pages)
- Notification panel on dashboard

## Feature Tracker
- `features.json` — 20 features, all done, split across 5 categories: setup, dashboard, customers, services, admin
