import { ApiError, payload, type EmployeeDoc, type EnquiryDoc, type PayloadUser } from "@/lib/api";
import { requireApiAuth, tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

export type LeadActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  memberId?: number;
};

export type CreateLeadInput = {
  fullName: string;
  contact: string;
  email?: string;
  source: "walk-in" | "website" | "referral" | "ad";
  notes?: string;
};

export async function createLeadAction(input: CreateLeadInput): Promise<LeadActionResult> {
  const { token } = await requireApiAuth();

  const fullName = input.fullName?.trim();
  if (!fullName) return { ok: false, error: "Lead name is required." };

  const contact = input.contact?.replace(/\s+/g, "").trim();
  if (!contact) return { ok: false, error: "Phone or contact is required." };

  try {
    await payload.create<EnquiryDoc>(
      "enquiry",
      {
        fullName,
        contact,
        email: input.email?.trim().toLowerCase() || undefined,
        source: input.source,
        status: "new",
        notes: input.notes?.trim() || undefined,
      },
      token,
    );
    return { ok: true, message: "Lead added" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not save the lead.",
    };
  }
}

export async function updateLeadStatusAction(
  leadId: number,
  status: string,
): Promise<LeadActionResult> {
  const { token } = await requireApiAuth();

  try {
    await payload.update<EnquiryDoc>("enquiry", leadId, { status }, token);
    return { ok: true, message: "Lead updated" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the lead.",
    };
  }
}

export async function assignConsultantAction(
  leadId: number,
  employeeId: number | null,
): Promise<LeadActionResult> {
  const { token, user } = await requireApiAuth();

  if (user.role === "consultant") {
    return { ok: false, error: "Only the facility partner can reassign leads." };
  }

  try {
    await payload.update<EnquiryDoc>(
      "enquiry",
      leadId,
      { enquiryConsultant: employeeId },
      token,
    );
    return { ok: true, message: employeeId ? "Lead assigned" : "Lead unassigned" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not assign the lead.",
    };
  }
}

/**
 * Converts a lead into a member account (phone/OTP login ready) and marks the
 * enquiry converted. The portal then drops the user into the activation wizard.
 */
export async function convertLeadAction(leadId: number): Promise<LeadActionResult> {
  const { token } = await requireApiAuth();

  let lead: EnquiryDoc;
  try {
    lead = await payload.get<EnquiryDoc>("enquiry", leadId, { depth: 0 }, token);
  } catch {
    return { ok: false, error: "Lead not found." };
  }

  const fullName = lead.fullName?.trim();
  const digits = String(lead.contact ?? "").replace(/\D/g, "").slice(-10);

  if (!fullName) {
    return { ok: false, error: "Add the lead's name before converting." };
  }
  if (digits.length !== 10) {
    return {
      ok: false,
      error: "A 10-digit mobile number is required to create the member account — update the lead first.",
    };
  }

  try {
    const member = await payload.create<PayloadUser>(
      "users",
      {
        fullName,
        phone: digits,
        email: lead.email?.trim().toLowerCase() || `${digits}@otp.local`,
        role: "member",
        password: "ultim@123",
        isPhoneVerified: false,
        _verified: true,
      },
      token,
    );

    await payload.update<EnquiryDoc>(
      "enquiry",
      leadId,
      { status: "convertee", notes: `${lead.notes ? `${lead.notes}\n` : ""}[Converted to member #${member.id}]` },
      token,
    );

    return { ok: true, memberId: member.id, message: "Member created" };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Could not convert the lead.";
    return {
      ok: false,
      error: /phone|unique/i.test(message)
        ? "A member with this phone number already exists — search them under Members instead."
        : message,
    };
  }
}

/** Employees available for lead assignment (tenant scoped). */
export async function listAssignableEmployeesAction(): Promise<{
  id: number;
  name: string;
}[]> {
  const { user, token } = await requireApiAuth();

  const employees = await payload.list<EmployeeDoc>(
    "employee",
    { where: combineWhere(tenantScope(user)), limit: 100, depth: 1 },
    token,
  );

  return (employees.docs ?? []).map((employee) => {
    const userDoc =
      employee.employee && typeof employee.employee !== "number"
        ? (employee.employee as PayloadUser)
        : null;
    return {
      id: employee.id,
      name:
        employee.employeeName?.trim() ||
        userDoc?.fullName?.trim() ||
        userDoc?.email ||
        `Employee #${employee.id}`,
    };
  });
}
