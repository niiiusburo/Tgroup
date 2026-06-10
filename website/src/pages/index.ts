/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[website/src/App.tsx (lazy route imports for all main SPA pages)]
 * @crossref:uses[website/src/pages/ (Overview, Calendar, Customers, Employees, Locations, ServiceCatalog, Settings, Relationships, Commission, Notifications, PermissionBoard, Login, Payment, Landing), product-map/domains/settings-system.yaml]
 */
/**
 * Page Components Barrel Export
 */

export { Overview } from './Overview';
export { Calendar } from './Calendar';
export { Customers } from './Customers';
export { Employees } from './Employees/index';
export { Locations } from './Locations';
export { ServiceCatalog } from './ServiceCatalog';
export { Settings } from './Settings/index';
export { Relationships } from './Relationships';
export { Commission } from './Commission';
// Reports uses default export — imported directly in App.tsx via lazy()
export { Notifications } from './Notifications';
export { PermissionBoard } from './PermissionBoard';
export { Login } from './Login';
export { Payment } from './Payment';
export { Landing } from './Landing';
