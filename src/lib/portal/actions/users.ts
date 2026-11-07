import { ApiError, payload, type PayloadUser } from "@/lib/api";
import { requireAdmin } from "@/lib/scope";

export type UserActionResult = { ok: boolean; error?: string; message?: string };

export async function updateUserRoleAction(
  userId: number,
  role: "admin" | "partner" | "consultant" | "member",
): Promise<UserActionResult> {
  const { token, user } = await requireAdmin();

  if (user.id === userId && role !== "admin") {
    return { ok: false, error: "You can't remove your own admin access." };
  }

  try {
    await payload.update<PayloadUser>("users", userId, { role }, token);
    return { ok: true, message: "Role updated" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the role.",
    };
  }
}

export async function updateUserTenantAction(
  userId: number,
  tenantId: number | null,
): Promise<UserActionResult> {
  const { token } = await requireAdmin();

  try {
    await payload.update<PayloadUser>(
      "users",
      userId,
      { tenant: tenantId ?? undefined },
      token,
    );
    return { ok: true, message: tenantId ? "Facility linked" : "Facility unlinked" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the facility link.",
    };
  }
}
