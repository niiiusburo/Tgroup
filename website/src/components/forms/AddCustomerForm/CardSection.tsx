export function CardSection({
  title,
  icon: Icon,
  children,
  action,
  className = '',
  maxHeight = 'none',
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden ${className}`}
      style={{ maxHeight: maxHeight !== 'none' ? maxHeight : undefined }}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-orange-500" />}
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

// Mini Dialog for adding sources/referrers
