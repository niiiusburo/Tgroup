export function FieldLabel({
  children,
  icon: Icon,
  required,
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

/**
 * CardSection - Reusable card component with INDEPENDENT scrolling
 * IMPORTANT: This component enforces a fixed height container where:
 * - The header stays visible (flex-shrink-0)
 * - Only the content area scrolls (overflow-y-auto)
 */
