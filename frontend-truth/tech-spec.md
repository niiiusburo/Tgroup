# Orbit CRM Dashboard - Technical Specification

## 1. Tech Stack Overview

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS 3.4 |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| Animation | Framer Motion |
| State | React hooks (useState, useEffect) |

## 2. Tailwind Configuration

```javascript
// tailwind.config.js extensions
{
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
          lighter: '#FFF7ED',
        },
        sidebar: '#1F2937',
        surface: '#FFFFFF',
        background: '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
      },
    },
  },
}
```

## 3. Component Inventory

### Shadcn/UI Components (Pre-installed)
- Button
- Card
- Avatar
- Badge
- Checkbox
- Table
- Tabs
- Tooltip
- DropdownMenu

### Custom Components

#### Layout Components
| Component | Props | Description |
|-----------|-------|-------------|
| `Sidebar` | `activeItem?: string` | Dark sidebar with navigation |
| `Header` | `title: string` | Page header with actions |
| `DashboardLayout` | `children: ReactNode` | Main layout wrapper |

#### Module Components (Cherry-pickable)
| Component | Props | Description |
|-----------|-------|-------------|
| `RevenueChartModule` | `data: RevenueData[]` | Product revenue bar chart |
| `StatCardModule` | `title, value, change, icon, chartType` | Individual stat card |
| `TotalVisitModule` | `mobile, desktop, total` | Visit statistics widget |
| `ProductTableModule` | `products: Product[]` | Top products table |
| `NavigationTabsModule` | `activeTab, onTabChange` | Tab navigation |

### Component Props Interfaces

```typescript
// RevenueChart
interface RevenueData {
  month: string;
  fashion: number;
  electronics: number;
}

// StatCard
interface StatCardProps {
  title: string;
  value: string;
  change: number; // percentage
  changeType: 'positive' | 'negative';
  icon: React.ComponentType;
  chartType: 'bar' | 'donut' | 'line';
  chartData?: any[];
}

// TotalVisit
interface TotalVisitProps {
  total: number;
  mobile: number;
  desktop: number;
  changePercent: number;
}

// Product
interface Product {
  id: string;
  name: string;
  variant: string;
  sales: number;
  revenue: number;
  stock: number;
  status: 'in-stock' | 'out-of-stock' | 'restock';
}
```

## 4. Animation Implementation Plan

| Interaction | Tech | Implementation |
|-------------|------|----------------|
| Page Load Stagger | Framer Motion | `staggerChildren: 0.05` on container, `y: 20 -> 0, opacity: 0 -> 1` on items |
| Card Hover | Framer Motion | `whileHover: { scale: 1.01, boxShadow: '...' }` |
| Sidebar Slide | Framer Motion | `initial: { x: -72 }, animate: { x: 0 }` |
| Chart Bars | Recharts + CSS | `animationDuration: 1000`, `animationBegin: 200` |
| Progress Bar | Framer Motion | `initial: { width: 0 }, animate: { width: '60%' }` with spring |
| Number Count | Custom Hook | `useCountUp(target, duration)` with requestAnimationFrame |
| Tab Underline | CSS | `transition: transform 200ms ease` |
| Button Hover | Tailwind | `hover:bg-primary/90 transition-colors duration-150` |
| Table Row Hover | Tailwind | `hover:bg-gray-50 transition-colors duration-150` |
| Icon Scale | Framer Motion | `whileHover: { scale: 1.1 }` |

### Animation Timing Constants

```typescript
const ANIMATION = {
  duration: {
    fast: 0.15,
    normal: 0.2,
    slow: 0.3,
    chart: 1,
  },
  ease: {
    default: [0.4, 0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
  },
  stagger: 0.05,
};
```

## 5. Project File Structure

```
/mnt/okcomputer/output/app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── DashboardLayout.tsx
│   │   └── modules/         # Cherry-pickable modules
│   │       ├── RevenueChartModule.tsx
│   │       ├── StatCardModule.tsx
│   │       ├── TotalVisitModule.tsx
│   │       ├── ProductTableModule.tsx
│   │       └── NavigationTabsModule.tsx
│   ├── hooks/
│   │   └── useCountUp.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── animation.ts
│   ├── types/
│   │   └── index.ts
│   ├── data/
│   │   └── mockData.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## 6. Package Installation

```bash
# Animation library
npm install framer-motion

# Charts
npm install recharts

# Icons (already included)
# lucide-react

# Fonts
npm install @fontsource/inter
```

## 7. Module Usage Examples

### Using Individual Modules

```tsx
// Import only what you need
import { RevenueChartModule } from './components/modules/RevenueChartModule';
import { StatCardModule } from './components/modules/StatCardModule';

function CustomDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <StatCardModule
        title="Active Sales"
        value="$24,064"
        change={12}
        icon={Clock}
        chartType="bar"
      />
      {/* ... */}
    </div>
  );
}
```

### Using Full Dashboard

```tsx
import { FullDashboard } from './FullDashboard';

function App() {
  return <FullDashboard />;
}
```

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, hidden sidebar |
| Tablet | 640-1024px | 2 columns, collapsed sidebar |
| Desktop | > 1024px | Full layout, expanded sidebar |

## 9. Performance Considerations

1. **Chart Rendering**: Use Recharts' `isAnimationActive` prop to disable on reduced motion
2. **Animation**: Use `will-change: transform` on animated elements
3. **Images**: Lazy load avatars and product images
4. **Bundle**: Code-split modules for tree-shaking
