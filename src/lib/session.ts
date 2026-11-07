export const TOKEN_COOKIE = "ultim_token";
export const SESSION_COOKIE = "ultim_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — mirrors Payload's tokenExpiration

export type StaffRole = "admin" | "partner" | "consultant";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  tenantId: number | null;
  tenantName: string | null;
};

const TOKEN_KEY = "ultim_token";
const SESSION_KEY = "ultim_session";

export function encodeSession(user: SessionUser): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(user))));
}

export function decodeSession(value?: string | null): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(value))));
    if (!parsed?.id || !parsed?.role) return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

/** Browser-only session storage. Safe to call during static rendering. */
export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // Storage can be unavailable in private mode — the session still lives
    // in React state for the current tab.
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Synchronous client accessors used by the portal data layer. */
export function getSession(): SessionUser | null {
  return readSession();
}

export function getToken(): string | null {
  return readToken();
}

export function getAuth(): { user: SessionUser | null; token: string | null } {
  return { user: readSession(), token: readToken() };
}

export const isAdmin = (user: SessionUser | null) => user?.role === "admin";

/** Roles allowed into the portal at all (members use the mobile app). */
export const isStaffRole = (role?: string | null): role is StaffRole =>
  role === "admin" || role === "partner" || role === "consultant";
