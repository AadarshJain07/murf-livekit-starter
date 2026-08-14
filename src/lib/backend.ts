const STORAGE_KEY = "revora_backend_url";

/**
 * Resolves the URL of the locally-run Python analytics backend.
 *
 * Order of precedence (first match wins):
 *   1. `?backend=https://...` query param (also persisted for later visits)
 *   2. `localStorage["revora_backend_url"]`
 *   3. `VITE_BACKEND_URL` build-time env var
 *
 * Returns "" when nothing is configured, in which case callers fall back to
 * the built-in `/api/*` routes.
 */
export function getBackendUrl(): string {
  if (typeof window === "undefined") return "";

  try {
    const fromQuery = new URLSearchParams(window.location.search).get("backend");
    if (fromQuery) {
      const clean = fromQuery.replace(/\/+$/, "");
      window.localStorage.setItem(STORAGE_KEY, clean);
      return clean;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  } catch {
    // localStorage may be unavailable (private mode) — ignore.
  }

  const fromEnv = (import.meta as any).env?.VITE_BACKEND_URL || "";
  return String(fromEnv).replace(/\/+$/, "");
}

export function setBackendUrl(url: string) {
  if (typeof window === "undefined") return;
  const clean = url.trim().replace(/\/+$/, "");
  if (clean) window.localStorage.setItem(STORAGE_KEY, clean);
  else window.localStorage.removeItem(STORAGE_KEY);
}
