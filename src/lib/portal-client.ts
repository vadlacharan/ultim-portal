import type { MembershipPlan } from "./api";
import { ApiError } from "./api";
import * as activate from "./portal/actions/activate";
import * as appReleases from "./portal/actions/app-releases";
import * as bookings from "./portal/actions/bookings";
import * as employees from "./portal/actions/employees";
import * as facility from "./portal/actions/facility";
import * as leads from "./portal/actions/leads";
import * as plans from "./portal/actions/plans";
import * as profile from "./portal/actions/profile";
import * as tenants from "./portal/actions/tenants";
import * as users from "./portal/actions/users";
import type { AppReleaseInput } from "./portal/actions/app-releases";
import type { CreateLeadInput, UpdateLeadInput } from "./portal/actions/leads";
import type { EmployeeInput } from "./portal/actions/employees";
import type { FacilityInput } from "./portal/actions/facility";
import type { PlanInput } from "./portal/actions/plans";
import type { MemberProfile } from "./portal/actions/profile";
import { refreshPortal } from "./portal-refresh";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  id?: number;
  tenantId?: number;
  memberId?: number;
  membershipId?: number;
  transactionId?: number;
  newDue?: number;
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/** Runs a mutation, surfaces errors as `{ ok:false }`, and tells pages to refetch. */
async function mutate<T extends { ok?: boolean }>(
  run: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    const result = await run();
    if (result?.ok !== false) refreshPortal();
    return result;
  } catch (err) {
    return { ok: false, error: errorMessage(err, fallback) } as unknown as T;
  }
}

const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Client-side gateway to every portal query and mutation. */
export const portalCall = {
  // Members & payments
  searchMembers: (query: string) =>
    activate.searchMembersAction(query).then((r) => asList<activate.MemberSearchResult>(r)),
  createMember: (input: { fullName: string; phone: string; email?: string }) =>
    mutate(() => activate.createMemberAction(input), "Could not create the member."),
  listMemberPasses: (memberId: number) =>
    activate.listMemberPassesAction(memberId).then((r) => asList<activate.MemberPass>(r)),
  memberSnapshot: (memberId: number) => activate.memberSnapshotAction(memberId),
  getMemberProfile: (memberId: number) =>
    mutate(() => profile.getMemberProfileAction(memberId), "Could not load the member."),
  listActivePlans: () =>
    activate.listActivePlansAction().then((r) => asList<MembershipPlan>(r)),
  activateMembership: (input: activate.ActivateInput) =>
    mutate(() => activate.activateMembershipAction(input), "Could not activate the membership."),
  settlePassDue: (input: activate.SettlePassInput) =>
    mutate(() => activate.settlePassDueAction(input), "Could not record the payment."),
  recordPayment: (input: activate.RecordPaymentInput) =>
    mutate(() => activate.recordPaymentAction(input), "Could not record the payment."),
  allocatePayment: (transactionId: number, targetMembershipId: number | null) =>
    mutate(
      () => activate.allocatePaymentAction(transactionId, targetMembershipId),
      "Could not allocate the payment.",
    ),

  // Bookings
  checkInOut: (bookingId: number, qrCode: string) =>
    mutate(() => bookings.checkInOutAction(bookingId, qrCode), "Gate check failed."),
  cancelBooking: (bookingId: number) =>
    mutate(() => bookings.cancelBookingAction(bookingId), "Could not cancel the booking."),

  // Leads
  createLead: (input: CreateLeadInput) =>
    mutate(() => leads.createLeadAction(input), "Could not create the lead."),
  updateLead: (input: UpdateLeadInput) =>
    mutate(() => leads.updateLeadAction(input), "Could not update the lead."),
  updateLeadStatus: (leadId: number, status: string) =>
    mutate(() => leads.updateLeadStatusAction(leadId, status), "Could not update the lead."),
  assignConsultant: (leadId: number, employeeId: number | null) =>
    mutate(() => leads.assignConsultantAction(leadId, employeeId), "Could not assign the lead."),
  convertLead: (leadId: number) =>
    mutate(() => leads.convertLeadAction(leadId), "Could not convert the lead."),

  // Employees
  createEmployee: (input: EmployeeInput) =>
    mutate(() => employees.createEmployeeAction(input), "Could not create the employee."),
  updateEmployee: (
    employeeId: number,
    input: Pick<EmployeeInput, "gender" | "joiningDate" | "contact" | "address">,
  ) =>
    mutate(() => employees.updateEmployeeAction(employeeId, input), "Could not save the employee."),

  // Facility
  updateFacility: (tenantId: number, input: FacilityInput) =>
    mutate(() => facility.updateFacilityAction(tenantId, input), "Could not save the facility."),
  uploadFacilityImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return mutate(
      () => facility.uploadFacilityImage(formData),
      "Could not upload the image.",
    );
  },

  // Plans
  createPlan: (input: PlanInput) =>
    mutate(() => plans.createPlanAction(input), "Could not create the plan."),
  updatePlan: (planId: number, input: PlanInput) =>
    mutate(() => plans.updatePlanAction(planId, input), "Could not save the plan."),
  setPlanActive: (planId: number, active: boolean) =>
    mutate(() => plans.setPlanActiveAction(planId, active), "Could not update the plan."),

  // App releases (admin)
  createAppRelease: (input: AppReleaseInput) =>
    mutate(() => appReleases.createAppReleaseAction(input), "Could not publish the release."),
  updateAppRelease: (releaseId: number, input: AppReleaseInput) =>
    mutate(() => appReleases.updateAppReleaseAction(releaseId, input), "Could not save the release."),
  setAppReleaseActive: (releaseId: number, active: boolean) =>
    mutate(
      () => appReleases.setAppReleaseActiveAction(releaseId, active),
      "Could not update the release.",
    ),

  // Tenants (admin)
  createTenant: (input: { Facility: string; city: string; description: string }) =>
    mutate(() => tenants.createTenantAction(input), "Could not create the facility."),
  createPartner: (input: { tenantId: number; fullName: string; email: string; password: string }) =>
    mutate(() => tenants.createPartnerAction(input), "Could not create the partner."),

  // Users (admin)
  updateUserRole: (userId: number, role: "admin" | "partner" | "consultant" | "member") =>
    mutate(() => users.updateUserRoleAction(userId, role), "Could not update the role."),
  updateUserTenant: (userId: number, tenantId: number | null) =>
    mutate(() => users.updateUserTenantAction(userId, tenantId), "Could not update the facility."),
};

export type { MemberProfile };

/** Compatibility shim for components that still pass serialisable descriptors. */
export async function portalPost<T>(
  action: string,
  input?: unknown,
): Promise<T> {
  const payload = (input ?? {}) as { bookingId?: number; qrCode?: string };
  if (action === "bookings.checkInOut") {
    return portalCall.checkInOut(
      Number(payload.bookingId),
      String(payload.qrCode ?? ""),
    ) as Promise<T>;
  }
  if (action === "bookings.cancel") {
    return portalCall.cancelBooking(Number(payload.bookingId)) as Promise<T>;
  }
  return { ok: false, error: `Unknown action: ${action}` } as unknown as T;
}
