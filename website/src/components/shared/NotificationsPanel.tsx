import {
  Bell,
  CalendarCheck,
  CreditCard,
  UserPlus,
  Settings,
} from 'lucide-react';
import type { Notification } from '@/data/mockDashboard';

/**
 * NotificationsPanel - Recent alerts list
 * @crossref:used-in[Overview, Header]
 */

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  appointment: { icon: CalendarCheck, color: 'text-dental-blue bg-dental-blue/10' },
  payment: { icon: CreditCard, color: 'text-dental-green bg-dental-green/10' },
  customer: { icon: UserPlus, color: 'text-dental-purple bg-dental-purple/10' },
  system: { icon: Settings, color: 'text-gray-500 bg-gray-100' },
};

interface NotificationsPanelProps {
  readonly notifications: readonly Notification[];
  readonly onMarkRead?: (id: string) => void;
  readonly onViewAll?: () => void;
}

export function NotificationsPanel({
  notifications,
  onMarkRead,
  onViewAll,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-white rounded-xl shadow-card flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            View All
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50 overflow-y-auto max-h-80">
        {notifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type];
          const Icon = config.icon;
          return (
            <button
              key={notification.id}
              onClick={() => onMarkRead?.(notification.id)}
              className={`
                w-full flex items-start gap-3 p-4 text-left
                hover:bg-gray-50 transition-colors duration-150
                ${!notification.read ? 'bg-primary/5' : ''}
              `}
            >
              <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                  {notification.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {notification.timestamp}
                </p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
