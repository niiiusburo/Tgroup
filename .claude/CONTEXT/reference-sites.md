# Reference Sites & API Endpoints

## Reference Sites

- **Original TG Clinic (legacy):** `https://tamdentist.tdental.vn` (admin / 123123@)
- **Local replica:** `http://127.0.0.1:8899` (admin@tgclinic.vn / admin123) — requires Golden backend
- **VPS Deployed:** `http://76.13.16.68:5174` (admin@tgclinic.vn / admin123)

## API Endpoints

| Endpoint | Data | Notes |
|----------|------|-------|
| `/api/Partners` | 30 customers | search, companyId filter |
| `/api/Partners/:id` | Single customer profile | All 87 partner fields |
| `/api/Employees` | 19 doctors | companyId, isDoctor filters |
| `/api/Appointments` | 120 appointments | dateFrom/dateTo, state, partner_id, companyId |
| `/api/Companies` | 7 locations | All branches |
| `/api/SaleOrders` | 0 (empty view) | No sale orders in demo |
| `/api/Products` | error | productcategories table missing |
| `/api/DashboardReports` | varies | Aggregation endpoint |
