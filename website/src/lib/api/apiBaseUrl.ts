/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[website/src/lib/api/core.ts (apiFetch + getUploadUrl), website/src/lib/silentFailureReporter.ts, website/src/lib/api/* clients that build upload URLs]
 * @crossref:uses[None — this is a leaf config module to avoid import cycles]
 *
 * Single-source-of-truth for the API base URL. Kept separate from
 * website/src/lib/api/core.ts so that telemetry modules (e.g. silentFailureReporter)
 * can read the base URL without statically importing the fetch wrapper.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
