/**
 * AppointmentHoverContext - Manages bidirectional hover linking between
 * PatientCheckIn and TodayAppointments components
 * @crossref:used-in[PatientCheckIn, TodayAppointments, Overview]
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type MutableRefObject,
} from 'react';

interface AppointmentHoverContextValue {
  /** Currently hovered appointment ID */
  hoveredId: string | null;
  /** Set the hovered appointment ID (null to clear) */
  setHoveredId: (id: string | null) => void;
  /** Map of appointment IDs to their DOM element refs */
  appointmentRefs: MutableRefObject<Map<string, HTMLElement>>;
  /** Register a DOM ref for an appointment */
  registerRef: (id: string, element: HTMLElement | null) => void;
  /** Scroll to an appointment by ID */
  scrollToAppointment: (id: string) => void;
}

const AppointmentHoverContext = createContext<AppointmentHoverContextValue | null>(null);

interface AppointmentHoverProviderProps {
  readonly children: ReactNode;
}

export function AppointmentHoverProvider({ children }: AppointmentHoverProviderProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Store refs to appointment DOM elements for scrolling
  const appointmentRefs = useRef<Map<string, HTMLElement>>(new Map());

  /**
   * Register a DOM element ref for an appointment
   */
  const registerRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      appointmentRefs.current.set(id, element);
    } else {
      appointmentRefs.current.delete(id);
    }
  }, []);

  /**
   * Scroll to an appointment by ID with smooth animation
   */
  const scrollToAppointment = useCallback((id: string) => {
    const element = appointmentRefs.current.get(id);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  const value: AppointmentHoverContextValue = {
    hoveredId,
    setHoveredId,
    appointmentRefs,
    registerRef,
    scrollToAppointment,
  };

  return (
    <AppointmentHoverContext.Provider value={value}>
      {children}
    </AppointmentHoverContext.Provider>
  );
}

/**
 * Hook to use appointment hover context
 * @throws Error if used outside of AppointmentHoverProvider
 */
export function useAppointmentHover(): AppointmentHoverContextValue {
  const context = useContext(AppointmentHoverContext);
  if (!context) {
    throw new Error(
      'useAppointmentHover must be used within AppointmentHoverProvider'
    );
  }
  return context;
}
