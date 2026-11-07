"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError, payload, type PayloadUser, type Tenant } from "@/lib/api";
import {
  clearSession,
  isStaffRole,
  readSession,
  readToken,
  saveSession,
  type SessionUser,
} from "@/lib/session";

type LoginResponse = {
  token: string;
  exp?: number;
  user: PayloadUser;
};

type LoginResult = { ok: boolean; error?: string };

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const toSession = async (login: LoginResponse): Promise<SessionUser> => {
  let tenantId: number | null = null;
  let tenantName: string | null = null;
  const rawTenant = login.user.tenant;

  if (rawTenant && typeof rawTenant === "object") {
    tenantId = rawTenant.id ?? null;
    tenantName = rawTenant.Facility ?? null;
  } else if (typeof rawTenant === "number") {
    tenantId = rawTenant;
  }

  if (tenantId && !tenantName) {
    try {
      const tenant = await payload.get<Tenant>("tenants", tenantId, { depth: 0 }, login.token);
      tenantName = tenant?.Facility ?? null;
    } catch {
      // Non-fatal — the shell falls back to a generic label.
    }
  }

  return {
    id: login.user.id,
    name: login.user.fullName?.trim() || login.user.email,
    email: login.user.email,
    role: login.user.role as SessionUser["role"],
    tenantId,
    tenantName,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage, then verify the token quietly.
  useEffect(() => {
    const storedToken = readToken();
    const storedUser = readSession();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setLoading(false);

    if (!storedToken) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<PayloadUser>("/api/users/me", {
          token: storedToken,
          query: { depth: 0 },
        });
        if (!me || !isStaffRole(me.role)) throw new Error("not staff");
        const session = await toSession({ token: storedToken, user: me });
        if (cancelled) return;
        saveSession(storedToken, session);
        setUser(session);
        setToken(storedToken);
      } catch (err) {
        if (cancelled) return;
        // Only a rejected token should sign the user out. A temporary network
        // failure keeps the cached session so the portal still opens offline.
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          setUser(null);
          setToken(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const result = await apiFetch<LoginResponse>("/api/users/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });

      if (!isStaffRole(result.user?.role)) {
        return {
          ok: false,
          error:
            result.user?.role === "member"
              ? "Member accounts use the ULTIM mobile app. Ask an admin for a staff account."
              : "This account cannot access the partner portal.",
        };
      }

      const session = await toSession(result);

      if (session.role !== "admin" && !session.tenantId) {
        return {
          ok: false,
          error: "Your account is not linked to a facility yet. Contact ULTIM support.",
        };
      }

      saveSession(result.token, session);
      setToken(result.token);
      setUser(session);
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not sign you in. Please try again.";
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const currentToken = readToken();
    if (!currentToken) return;
    try {
      const me = await apiFetch<PayloadUser>("/api/users/me", {
        token: currentToken,
        query: { depth: 0 },
      });
      if (!isStaffRole(me.role)) throw new Error("not staff");
      const session = await toSession({ token: currentToken, user: me });
      saveSession(currentToken, session);
      setToken(currentToken);
      setUser(session);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refresh }),
    [user, token, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
