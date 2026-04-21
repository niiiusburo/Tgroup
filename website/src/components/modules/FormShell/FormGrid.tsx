/**
 * FormGrid — Column grid layouts for TG Clinic modal forms.
 *
 * Provides consistent grid layouts:
 * - 1 column (full width)
 * - 2 columns (half/half)
 * - 3 columns (third/third/third)
 * - 4 columns (quarter/quarter/quarter/quarter)
 *
 * USAGE:
 * <FormGrid cols={3} gap="md">
 *   <div>Field 1</div>
 *   <div>Field 2</div>
 *   <div>Field 3</div>
 * </FormGrid>
 *
 * @crossref:used-in[FormShell, AddCustomerForm, ServiceForm, AppointmentForm]
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormGridProps {
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const GAP_MAP = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const COL_MAP = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export function FormGrid({
  cols = 2,
  gap = 'md',
  children,
  className,
}: FormGridProps) {
  return (
    <div
      className={cn(
        'grid',
        COL_MAP[cols],
        GAP_MAP[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
