/**
 * useModal — Standardized modal state management hook
 * Replaces duplicated useState(boolean) + open/close/toggle patterns across pages.
 * @crossref:used-in[Customers, Calendar, ServiceCatalog, Employees, Locations, Payment]
 */
import { useState, useCallback } from 'react';

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useModal(initial = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((p) => !p), []);

  return { isOpen, open, close, toggle };
}
