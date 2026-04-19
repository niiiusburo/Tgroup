# TGClinic Build Rules

> How this project is built. This file tells the AI agent about the codebase structure, tech stack, conventions, and constraints.
> For visual design decisions, reference `design.md` in this directory.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.2 |
| Build Tool | Vite | 5.1 |
| Language | TypeScript | 5.3 |
| Styling | Tailwind CSS | 3.4 |
| Routing | React Router DOM | 6.22 |
| Animation | Framer Motion | 12.x |
| State | React Context + Hooks | — |
| Forms | Native + Zod validation | 3.23 |
| i18n | react-i18next | 17.x |
| Icons | lucide-react | 0.330 |
| Testing | Vitest + React Testing Library | — |
| E2E | Playwright | 1.59 |

---

## Directory Structure

```
website/
├── src/
│   ├── components/          # React components (feature-organized)
│   │   ├── appointments/    # Appointment-specific components
│   │   ├── calendar/        # Calendar views (month, week, day)
│   │   ├── customer/        # Customer/patient components
│   │   ├── employees/       # Staff management components
│   │   ├── forms/           # Reusable form components
│   │   ├── locations/       # Clinic location components
│   │   ├── payment/         # Payment & billing components
│   │   ├── reports/         # Report visualizations
│   │   ├── services/        # Service catalog components
│   │   ├── settings/        # Settings UI components
│   │   ├── shared/          # Cross-cutting shared components
│   │   └── ui/              # Primitive UI components (Button, Input, Modal, etc.)
│   ├── pages/               # Route-level page components
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React Context providers
│   ├── lib/                 # Utility functions, API clients
│   │   └── api/             # API route wrappers
│   ├── types/               # TypeScript type definitions
│   ├── constants/           # App constants (routes, permissions, etc.)
│   ├── data/                # Static data, mock data, transformers
│   ├── i18n/                # Internationalization
│   │   └── locales/         # Translation files (en/, vi/)
│   ├── __tests__/           # Global test utilities
│   └── test/                # Test setup and mocks
├── e2e/                     # Playwright E2E tests
├── public/                  # Static assets
├── scripts/                 # Build scripts (version generator, etc.)
└── docs/                    # Project documentation
```

### Component Organization Rules
1. **Feature folders**: Components live in feature folders (e.g., `components/calendar/`, `components/payment/`).
2. **Shared components**: Truly reusable components live in `components/shared/` or `components/ui/`.
3. **No deep nesting**: Maximum 3 levels of component folders.
4. **Barrel exports**: Each folder should export its public API via `index.ts`.

---

## Component Architecture

### File Structure per Component
```
MyComponent/
├── MyComponent.tsx       # Main component
├── MyComponent.test.tsx  # Unit tests (co-located)
├── useMyComponent.ts     # Component-specific hook (if complex)
├── types.ts              # Component-specific types (if needed)
└── index.ts              # Barrel export
```

### Component Rules
- Use **functional components** with hooks only. No class components.
- Use **named exports** for components (easier refactoring).
- Props interface must be named `{ComponentName}Props`.
- Default props via destructuring in the function signature.
- Complex logic must be extracted to a custom hook in the same folder.

### Example
```tsx
// components/ui/Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  loading = false,
}: ButtonProps) {
  // implementation
}
```

---

## State Management

### Pattern: React Context + Hooks
- **No Redux/Zustand** — the app uses React Context for global state.
- Contexts are in `src/contexts/`:
  - `AuthContext` — authentication & user session
  - `LocationContext` — active clinic location
  - `TimezoneContext` — timezone handling
- For local state: `useState`, `useReducer`.
- For shared logic: custom hooks in `src/hooks/`.

### Context Rules
- Always provide a custom hook: `useAuth()`, not `useContext(AuthContext)`.
- Split contexts by domain to avoid unnecessary re-renders.
- Keep context values stable — memoize objects and callbacks.

---

## API Layer

### Location
All API calls are in `src/lib/api/`.

### Pattern
```ts
// src/lib/api/customers.ts
import { apiClient } from './client';

export async function getCustomers(locationId: string): Promise<Customer[]> {
  const res = await apiClient.get(`/locations/${locationId}/customers`);
  return res.data;
}
```

### Rules
- **Always use the apiClient** — never call `fetch` directly in components.
- API functions must return typed Promises.
- Error handling: let errors propagate to the caller; components handle UI feedback.
- Loading states are managed by the component, not the API layer.

---

## Forms & Validation

### Pattern
- Use native form elements with Tailwind styling.
- Validate with **Zod** schemas.
- Form state managed locally with `useState` or `useReducer`.

### Example
```tsx
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleSubmit = (data: FormData) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      setErrors(/* extract errors */);
      return;
    }
    // submit
  };
}
```

---

## Routing

### Configuration
Routes are defined in `src/App.tsx` with React Router.

### Lazy Loading
All page components are lazy-loaded:
```tsx
const Overview = lazy(() => import('@/pages/Overview').then(m => ({ default: m.Overview })));
```

### Route Guards
Permissions are enforced via `ProtectedRoute` using `ROUTE_PERMISSIONS` mapping in `App.tsx`.

---

## Styling Conventions

### Tailwind Rules
- Use **utility classes** directly in JSX. No CSS-in-JS.
- Use `clsx` + `tailwind-merge` for conditional classes:
  ```tsx
  import { cn } from '@/lib/utils';
  <div className={cn('base', condition && 'conditional')}>
  ```
- Custom styles go in `src/index.css` with `@layer` directives.
- Tailwind config is in `tailwind.config.js` — extend, don't override.

### Class Ordering
Follow a consistent order:
1. Layout (`flex`, `grid`, `block`)
2. Positioning (`relative`, `absolute`)
3. Sizing (`w-`, `h-`, `min-w-`)
4. Spacing (`m-`, `p-`, `gap-`)
5. Typography (`text-`, `font-`)
6. Visuals (`bg-`, `border-`, `shadow-`)
7. State (`hover:`, `focus:`, `disabled:`)
8. Transitions (`transition-`, `duration-`)

---

## Module Size Rule (Strict)

**No single source file should exceed ~500 lines or ~10,000 characters.**

If a file approaches this limit, **refuse to add more code** and instead:
1. Extract sub-components, hooks, or utilities into separate files.
2. Use barrel exports (`index.ts`) to keep import paths clean.
3. Update cross-reference comments (`@crossref:uses[...]`) in the parent file.

**Exceptions**: Auto-generated files (e.g., `api.ts` with endpoint definitions), translation JSON files, and static data files.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- Co-located with components: `ComponentName.test.tsx`.
- Test behavior, not implementation.
- Mock API calls and external dependencies.
- Target: 80%+ coverage for utility functions and hooks.

### E2E Tests (Playwright)
- Located in `e2e/` folder.
- Cover critical user flows: login, booking, payment.
- Use `playwright.config.ts` for configuration.
- Run with: `npm run test:e2e`

### Test Rules
- Use `screen` queries from Testing Library.
- Prefer `userEvent` over `fireEvent`.
- Clean up after each test.

---

## i18n Patterns

### Setup
- Translations live in `src/i18n/locales/{lang}/{namespace}.json`.
- Supported languages: English (`en`), Vietnamese (`vi`).
- Translation keys use dot notation: `customers.form.name`.

### Usage
```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation('customers');
  return <h1>{t('form.name')}</h1>;
}
```

### Adding Translations
1. Add the key to both `en/` and `vi/` files.
2. Keep keys organized by feature/namespace.
3. Use the extraction scripts (`extract-i18n.cjs`) to find missing keys.

---

## Version Policy

**ALWAYS bump the version in `package.json` after making code changes.**

Format: `major.minor.patch` (current: `0.23.5`)
- **Patch** (0.23.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, significant changes
- **Major** (x.0.0): Breaking changes

The build timestamp and git info are auto-generated by `scripts/generate-version.js`.

---

## Build & Deploy

### Local Development
```bash
npm run dev          # Vite dev server
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run lint         # ESLint
```

### Production Build
```bash
npm run build:prod   # TypeScript compile + Vite production build
```

### Deployment
- **Local-first rule**: All changes must be verified locally before pushing to VPS.
- The production build is served via Docker + Nginx.
- See root `docker-compose.yml` and `Dockerfile.web` for container setup.

---

## Code Quality

### Linting
- ESLint with TypeScript parser.
- React Hooks and React Refresh plugins enabled.
- Run `npm run lint` before committing.

### TypeScript
- Strict mode enabled.
- No `any` types — use `unknown` with type guards if needed.
- Prefer interfaces over types for object shapes.
- Use discriminated unions for complex state.

### Git
- Commit via conventional messages.
- The root `.husky/pre-commit` runs lint checks.

---

## Adding a New Feature

1. **Check product-map**: Read `../product-map/domains/{domain}.yaml` for the affected domain.
2. **Plan**: Outline components, hooks, and API calls needed.
3. **Types first**: Define types in `src/types/` or a local `types.ts`.
4. **API layer**: Add API functions in `src/lib/api/`.
5. **Build UI**: Create components in `src/components/{feature}/`.
6. **Add page**: Create page component in `src/pages/` if needed.
7. **Wire routing**: Add route in `src/App.tsx` with lazy loading.
8. **Add tests**: Write unit tests and E2E tests.
9. **Add i18n**: Add translation keys to both `en` and `vi`.
10. **Bump version**: Update `package.json` version.
11. **Verify**: Run `npm run lint`, `npm run test`, and manual QA.

---

## Cross-Reference Convention

When a file depends on another file's implementation details, add a cross-reference comment:

```tsx
// @crossref:used-in[ProtectedRoute]
const ROUTE_PERMISSIONS: Record<string, string> = { ... };

// @crossref:uses[ROUTE_PERMISSIONS]
function ProtectedRoute({ children }) { ... }
```

This helps the agent trace dependencies during refactors.

---

*Last updated: 2026-04-19*
*For visual design reference, see `design.md` in this directory.*
