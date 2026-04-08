# Agent 1: Backend API for Customer Calendar

## Task
Create `/api/Customers/Calendar` endpoint in tdental-api

## Requirements
1. New file: `tdental-api/src/routes/customers-calendar.js`
2. Endpoint: `GET /api/Customers/Calendar`
3. Query params: `dateFrom`, `dateTo`, `companyId` (location)
4. Return appointments with customer details grouped by date

## Response Format
```json
{
  "items": [
    {
      "date": "2026-04-07",
      "appointments": [
        {
          "id": "uuid",
          "customerId": "uuid",
          "customerName": "PHẠM THỊ KIM BẰNG",
          "customerPhone": "0778127008",
          "doctorId": "uuid",
          "doctorName": "BS. Trang",
          "time": "09:00",
          "serviceName": "Tư vấn răng sứ + trám răng",
          "status": "arrived",
          "notes": "...",
          "color": "1"
        }
      ]
    }
  ]
}
```

## Status Mapping
- DB state 'arrived', 'confirmed' → status 'arrived' (Đã đến)
- DB state 'confirmed' (future) → status 'scheduled' (Đang hẹn)
- DB state 'cancel', 'cancelled' → status 'cancelled' (Hủy hẹn)
- DB state 'no_show' → status 'no-show' (Quá hẹn)
- DB state 'done', 'completed' → status 'completed' (Hoàn thành)

## Database Query
Join appointments + partners + employees + companies tables
Group by date, order by time ascending

## Integration
Add to `tdental-api/src/server.js`:
```js
const customerCalendarRoutes = require('./routes/customers-calendar');
app.use('/api/Customers/Calendar', customerCalendarRoutes);
```

## Validation
- Validate dateFrom/dateTo are ISO dates
- Validate companyId is valid UUID if provided
- Return empty array if no appointments in range
