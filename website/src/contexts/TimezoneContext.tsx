/**
 * TimezoneContext - Global timezone state for the application
 * @crossref:used-in[App, Settings, Overview, Calendar]
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getTodayInTimezone,
  formatInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  addDaysInTimezone,
  addMonthsInTimezone,
  TIMEZONES,
  type TimezoneOption,
} from '@/lib/dateUtils';

const STORAGE_KEY = 'tgclinic_timezone';
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

interface TimezoneContextValue {
  /** Currently selected timezone */
  timezone: string;
  /** Set a new timezone and persist to localStorage */
  setTimezone: (tz: string) => void;
  /** List of available timezones */
  availableTimezones: TimezoneOption[];
  /** Get today's date (YYYY-MM-DD) in selected timezone */
  getToday: () => string;
  /** Get current moment as ISO string in selected timezone */
  getNow: () => string;
  /** Format a date in the selected timezone */
  formatDate: (date: Date | string, format?: string) => string;
  /** Get start of day string for a date in selected timezone */
  getStartOfDay: (dateStr: string) => string;
  /** Get end of day string for a date in selected timezone */
  getEndOfDay: (dateStr: string) => string;
  /** Add days to a date string in selected timezone */
  addDaysInTimezone: (dateStr: string, days: number) => string;
  /** Add months to a date string in selected timezone */
  addMonthsInTimezone: (dateStr: string, months: number) => string;
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

interface TimezoneProviderProps {
  readonly children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  // Initialize from localStorage or default
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored || DEFAULT_TIMEZONE;
    }
    return DEFAULT_TIMEZONE;
  });

  // Persist to localStorage when timezone changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, timezone);
    // Dispatch event for other tabs
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: timezone })
    );
  }, [timezone]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== timezone) {
        setTimezoneState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [timezone]);

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
  }, []);

  const getToday = useCallback(() => {
    return getTodayInTimezone(timezone);
  }, [timezone]);

  const getNow = useCallback(() => {
    return formatInTimezone(new Date(), timezone, 'yyyy-MM-ddTHH:mm:ss');
  }, [timezone]);

  const formatDate = useCallback(
    (date: Date | string, format: string = 'yyyy-MM-dd') => {
      return formatInTimezone(date, timezone, format);
    },
    [timezone]
  );

  const getStartOfDay = useCallback(
    (dateStr: string) => {
      return getStartOfDayInTimezone(dateStr, timezone);
    },
    [timezone]
  );

  const getEndOfDay = useCallback(
    (dateStr: string) => {
      return getEndOfDayInTimezone(dateStr, timezone);
    },
    [timezone]
  );

  const addDays = useCallback(
    (dateStr: string, days: number) => {
      return addDaysInTimezone(dateStr, days, timezone);
    },
    [timezone]
  );

  const addMonths = useCallback(
    (dateStr: string, months: number) => {
      return addMonthsInTimezone(dateStr, months, timezone);
    },
    [timezone]
  );

  const value = useMemo(
    () => ({
      timezone,
      setTimezone,
      availableTimezones: TIMEZONES,
      getToday,
      getNow,
      formatDate,
      getStartOfDay,
      getEndOfDay,
      addDaysInTimezone: addDays,
      addMonthsInTimezone: addMonths,
    }),
    [timezone, setTimezone, getToday, getNow, formatDate, getStartOfDay, getEndOfDay, addDays, addMonths]
  );

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return ctx;
}
