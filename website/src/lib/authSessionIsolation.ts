/**
 * @crossref:domain[auth]
 * @crossref:used-in[AuthContext, InvestorAuthContext]
 * @crossref:uses[website/src/lib/authToken.ts, website/src/lib/investorToken.ts, website/src/lib/api/core.ts, website/src/lib/api/investor.ts]
 */
import { clearAuthToken } from './authToken';
import { AUTH_UNAUTHORIZED_EVENT } from './api/core';
import { INVESTOR_UNAUTHORIZED_EVENT } from './api/investor';
import { clearInvestorToken } from './investorToken';

function dispatchSessionEvent(eventName: string): void {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch {
    // Storage/event dispatch can fail in non-browser test shells; token cleanup already happened.
  }
}

export function clearInvestorSessionForStaffMode(): void {
  clearInvestorToken();
  dispatchSessionEvent(INVESTOR_UNAUTHORIZED_EVENT);
}

export function clearStaffSessionForInvestorMode(): void {
  clearAuthToken();
  dispatchSessionEvent(AUTH_UNAUTHORIZED_EVENT);
}
