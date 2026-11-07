import { ApiError, apiFetch, payload, type EmployeeDoc, type PayloadUser } from "@/lib/api";
import { requireApiAuth } from "@/lib/scope";

export type EmployeeActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export type EmployeeInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: "male" | "female";
  joiningDate: string;
  contact: string;
  address: string;
};

export async function createEmployeeAction(
  input: EmployeeInput,
): Promise<EmployeeActionResult> {
  const { user, token } = await requireApiAuth();

  if (user.role === "consultant") {
    return { ok: false, error: "Only the facility partner can add employees." };
  }
  if (!user.tenantId && user.role !== "admin") {
    return { ok: false, error: "Your account isn't linked to a facility." };
  }
  if (!input.fullName?.trim()) return { ok: false, error: "Employee name is required." };
  if (!input.email?.trim()) return { ok: false, error: "Email is required for portal access." };
  if ((input.password ?? "").length < 8) {
    return { ok: false, error: "Set a password of at least 8 characters." };
  }

  // 1) Employee row first so we can clean up if account creation fails.
  let employeeId: number | undefined;
  try {
    const employee = await payload.create<EmployeeDoc>(
      "employee",
      {
        joiningDate: input.joiningDate || undefined,
        gender: input.gender,
        contact: input.contact?.trim() || undefined,
        address: input.address?.trim() || undefined,
      },
      token,
    );
    employeeId = employee.id;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not create the employee record.",
    };
  }

  // 2) Staff account bound to this tenant (backend forces the tenant).
  try {
    const created = await apiFetch<{ success: boolean; user: { id: number } }>(
      "/api/users/create-staff",
      {
        method: "POST",
        token,
        body: {
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.replace(/\s+/g, "") || undefined,
          password: input.password,
          role: "consultant",
        },
      },
    );

    // 3) Link the employee row to the new account.
    await payload.update<EmployeeDoc>("employee", employeeId, { employee: created.user.id }, token);
    return { ok: true, message: `${input.fullName.trim()} can now sign in to the portal` };
  } catch (err) {
    if (employeeId) {
      await payload.remove("employee", employeeId, token).catch(() => undefined);
    }
    return {
      ok: false,
      error:
        err instanceof ApiError
          ? err.message
          : "Could not create the staff account. The employee record was rolled back.",
    };
  }
}

export async function updateEmployeeAction(
  employeeId: number,
  input: Pick<EmployeeInput, "gender" | "joiningDate" | "contact" | "address">,
): Promise<EmployeeActionResult> {
  const { user, token } = await requireApiAuth();

  if (user.role === "consultant") {
    return { ok: false, error: "Only the facility partner can edit employees." };
  }

  try {
    await payload.update<EmployeeDoc>(
      "employee",
      employeeId,
      {
        gender: input.gender,
        joiningDate: input.joiningDate || undefined,
        contact: input.contact?.trim() || undefined,
        address: input.address?.trim() || undefined,
      },
      token,
    );
    return { ok: true, message: "Employee updated" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the employee.",
    };
  }
}

/** Employee + linked user account details for the edit dialog. */
export async function getEmployeeUserAction(employeeId: number): Promise<{
  name: string;
  email: string;
} | null> {
  const { token } = await requireApiAuth();
  try {
    const employee = await payload.get<EmployeeDoc>("employee", employeeId, { depth: 1 }, token);
    const userDoc =
      employee.employee && typeof employee.employee !== "number"
        ? (employee.employee as PayloadUser)
        : null;
    return {
      name: userDoc?.fullName ?? employee.employeeName ?? "",
      email: userDoc?.email ?? "",
    };
  } catch {
    return null;
  }
}
