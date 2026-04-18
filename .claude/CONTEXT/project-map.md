# Project Map

```
Tgroup/
├── website/                    # Frontend (React + TypeScript + Tailwind + Vite)
│   ├── src/
│   │   ├── App.tsx             # Router + LocationProvider wrapper
│   │   ├── contexts/           # Global state (LocationContext)
│   │   ├── pages/              # 14 page components
│   │   ├── components/
│   │   │   ├── shared/         # Global reusable (SearchBar, DataTable, StatusBadge, FilterByLocation, Selectors)
│   │   │   ├── modules/        # Dashboard modules (StatCard, RevenueChart, TodaySchedule)
│   │   │   ├── forms/          # Form components (AddCustomerForm)
│   │   │   ├── calendar/       # Calendar views (Day, Week, Month, TimeSlot)
│   │   │   ├── payment/        # Payment components (DepositWallet, PaymentForm, MonthlyPlan)
│   │   │   ├── locations/      # Location components (LocationCard, LocationDetail, LocationDashboard)
│   │   │   ├── employees/      # Employee components (EmployeeTable, EmployeeProfile, TierSelector)
│   │   │   ├── relationships/  # PermissionMatrix, EntityRelationshipMap
│   │   │   └── website/        # CMS components (PageEditor, PageList, SEOManager)
│   │   ├── hooks/              # Custom hooks (useCustomers, usePayment, useLocations, etc.)
│   │   ├── data/               # Mock data files (will be replaced by real DB queries)
│   │   ├── constants/          # App constants and theme colors
│   │   └── lib/                # Utilities
│   ├── package.json
│   └── vite.config.ts
│
├── blueprint/                  # Architecture & design docs
│   ├── BUTTON_MAP.md           # All buttons, filters, interactive elements mapped across pages
│   ├── App.jsx                 # Reference app from original TG Clinic
│   ├── components/             # Reference component specs
│   ├── constants/              # Reference constants
│   └── data/                   # Reference data structures
│
├── frontend-truth/             # Original TG Clinic frontend (ground truth for parity)
│   ├── app/                    # Built app with all original components
│   └── tech-spec.md            # Technical specification
│
├── features.json               # Feature tracker (20 features, all done)
├── .orchestrator/              # Agent Orchestrator config and DB
│   └── config.json             # Orchestrator settings (Claude agent, tracks)
└── web.jsx.backup              # Backup of original web app
```
