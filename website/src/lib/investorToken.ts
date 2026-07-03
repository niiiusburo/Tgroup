/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[InvestorAuthContext, investor API client]
 * @crossref:uses[product-map/domains/investor-portal.yaml]
 */

export const INVESTOR_TOKEN_KEY = 'tgclinic_investor_token';

export function getInvestorToken(): string | null {
  try {
    return localStorage.getItem(INVESTOR_TOKEN_KEY) || sessionStorage.getItem(INVESTOR_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setInvestorToken(token: string, rememberMe: boolean): void {
  try {
    if (rememberMe) {
      localStorage.setItem(INVESTOR_TOKEN_KEY, token);
      sessionStorage.removeItem(INVESTOR_TOKEN_KEY);
      return;
    }
    sessionStorage.setItem(INVESTOR_TOKEN_KEY, token);
    localStorage.removeItem(INVESTOR_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function clearInvestorToken(): void {
  try {
    localStorage.removeItem(INVESTOR_TOKEN_KEY);
    sessionStorage.removeItem(INVESTOR_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}