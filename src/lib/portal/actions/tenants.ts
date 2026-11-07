import { ApiError, apiFetch, payload, type Tenant } from "@/lib/api";
import { requireAdmin } from "@/lib/scope";

export type TenantActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  tenantId?: number;
};

export async function createTenantAction(input: {
  Facility: string;
  city: string;
  description: string;
}): Promise<TenantActionResult> {
  const { token } = await requireAdmin();

  const facility = input.Facility?.trim();
  if (!facility) return { ok: false, error: "Facility name is required." };

  try {
    const tenant = await payload.create<Tenant>(
      "tenants",
      {
        Facility: facility,
        city: input.city?.trim() || undefined,
        description: input.description?.trim() || undefined,
      },
      token,
    );
    return { ok: true, tenantId: tenant.id, message: `${facility} created` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not create the facility.",
    };
  }
}

export async function createPartnerAction(input: {
  tenantId: number;
  fullName: string;
  email: string;
  password: string;
}): Promise<TenantActionResult> {
  const { token } = await requireAdmin();

  if (!input.fullName?.trim()) return { ok: false, error: "Partner name is required." };
  if (!input.email?.trim()) return { ok: false, error: "Email is required." };
  if ((input.password ?? "").length < 8) {
    return { ok: false, error: "Set a password of at least 8 characters." };
  }

  try {
    await apiFetch("/api/users/create-staff", {
      method: "POST",
      token,
      body: {
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        role: "partner",
        tenant: input.tenantId,
      },
    });
    return { ok: true, message: "Partner account created" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not create the partner account.",
    };
  }
}
