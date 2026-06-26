/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[InvestorLogin, InvestorDashboard, App investor routes]
 * @crossref:uses[website/src/lib/api/investor.ts, website/src/lib/investorToken.ts]
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchInvestorMe,
  investorLogin,
  INVESTOR_UNAUTHORIZED_EVENT,
  type InvestorProfile,
} from '@/lib/api/investor';
import { clearInvestorToken, getInvestorToken, setInvestorToken } from '@/lib/investorToken';

interface InvestorAuthState {
  investor: InvestorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface InvestorAuthContextValue extends InvestorAuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const InvestorAuthContext = createContext<InvestorAuthContextValue | null>(null);

export function InvestorAuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<InvestorAuthState>({
    investor: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const clearSession = useCallback(() => {
    clearInvestorToken();
    setState({ investor: null, isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener(INVESTOR_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(INVESTOR_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    const token = getInvestorToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    fetchInvestorMe()
      .then((res) => {
        setState({
          investor: res.investor,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => clearSession());
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const res = await investorLogin(email, password);
    setInvestorToken(res.token, rememberMe);
    setState({
      investor: res.investor,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => clearSession(), [clearSession]);

  return (
    <InvestorAuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </InvestorAuthContext.Provider>
  );
}

export function useInvestorAuth(): InvestorAuthContextValue {
  const ctx = useContext(InvestorAuthContext);
  if (!ctx) throw new Error('useInvestorAuth must be used within InvestorAuthProvider');
  return ctx;
}