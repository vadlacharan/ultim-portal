import { ApiError } from "./api";
import { getAuth, type SessionUser } from "./session";
import type { WhereCondition } from "./query";

export type AuthContext = {
  user: SessionUser;
  token: string;
};

/** Client-side guard used by data helpers and mutations. */
export function requireAuth(): AuthContext {
  const { user, token } = getAuth();
  if (!user || !token) throw new ApiError("Not authenticated", 401);
  if (!["admin", "partner", "consultant"].includes(user.role)) {
    throw new ApiError("Not authenticated", 401);
  }
  return { user, token };
}

export const requireApiAuth = requireAuth;

/** Admin-only mutation guard. */
export function requireApiAdmin(): AuthContext {
  const context = requireAuth();
  if (context.user.role !== "admin") throw new ApiError("Admin access required", 403);
  return context;
}

export const requireAdmin = requireApiAdmin;

/** The tenant a partner/consultant is bound to. Admins have none (global scope). */
export function tenantIdOf(user: SessionUser): number | null {
  return user.role === "admin" ? null : user.tenantId;
}

/** `where tenant equals X` for tenant-scoped roles; undefined for admins. */
export function tenantScope(user: SessionUser): WhereCondition | undefined {
  const tenantId = tenantIdOf(user);
  return tenantId ? { field: "tenant", op: "equals", value: tenantId } : undefined;
}

export { istDateString, istDayRange, daysAgoISO } from "./dates";
