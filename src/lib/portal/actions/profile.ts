import {
  payload,
  type BookingDoc,
  type MembershipDoc,
  type MembershipPlan,
  type PayloadUser,
  type Tenant,
  type TransactionDoc,
} from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { computePassDue, linkedPassIdForPayment, paymentsTotalForPass, planNameOfPass } from "@/lib/dues";
import { requireApiAuth, tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

export type ProfilePass = {
  id: number;
  planId: number | null;
  planName: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  creditsGranted: number;
  creditsLeft: number;
  amountPaid: number;
  discountOffered: number;
  due: number;
  tenantName: string;
};

export type ProfilePayment = {
  id: number;
  amount: number;
  method: string;
  date: string | null;
  planName: string;
  linkedPassId: number | null;
  linkedPassName: string | null;
};

export type ProfileBooking = {
  id: number;
  activity: string;
  court: string;
  date: string | null;
  time: string | null;
  status: "cancelled" | "completed" | "in-gym" | "upcoming";
};

export type MemberProfile = {
  member: {
    id: number;
    name: string;
    phone: string | null;
    email: string;
    joined: string | null;
  };
  passes: ProfilePass[];
  payments: ProfilePayment[];
  bookings: ProfileBooking[];
  totals: {
    activePasses: number;
    creditsLeft: number;
    totalPaid: number;
    totalDue: number;
    unlinkedPayments: number;
  };
};

const planOf = (value: MembershipDoc["membershipPlan"]): MembershipPlan | null =>
  value && typeof value !== "number" ? value : null;

const tenantNameOf = (value: MembershipDoc["tenant"] | TransactionDoc["tenant"]): string =>
  value && typeof value !== "number" ? ((value as Tenant).Facility ?? "Facility") : "Facility";

/**
 * Everything the member profile screen renders, in one call. Plain JSON so the
 * client page can refetch instantly after a payment without a full SSR pass.
 */
export async function getMemberProfileAction(
  memberId: number,
): Promise<{ ok: boolean; error?: string; profile?: MemberProfile }> {
  const { user, token } = await requireApiAuth();

  if (!memberId || !Number.isFinite(memberId)) {
    return { ok: false, error: "Member not found." };
  }

  const scope = tenantScope(user);
  const now = new Date().toISOString();

  let member: PayloadUser;
  try {
    member = await payload.get<PayloadUser>("users", memberId, { depth: 0 }, token);
  } catch {
    return { ok: false, error: "Member not found." };
  }

  const [passesDocs, paymentsDocs, bookingsRes] = await Promise.all([
    fetchAll<MembershipDoc>(
      "memberships",
      {
        where: combineWhere(scope, { field: "member", op: "equals", value: memberId }),
        // Depth 1 populates plan + tenant (everything the dues math and
        // labels read). Depth 2 was additionally populating their nested
        // relations on every pass.
        depth: 1,
        sort: "-createdAt",
      },
      token,
      5,
    ),
    fetchAll<TransactionDoc>(
      "transactions",
      {
        where: combineWhere(scope, { field: "member", op: "equals", value: memberId }),
        depth: 1,
        sort: "-transactionDate",
      },
      token,
      5,
    ),
    payload.list<BookingDoc>(
      "bookings",
      {
        where: combineWhere(scope, { field: "member", op: "equals", value: memberId }),
        depth: 0,
        sort: "-sessionDate",
        limit: 10,
      },
      token,
    ),
  ]);

  // Partners/consultants may only open members attached to their facility.
  if (scope && passesDocs.length === 0 && paymentsDocs.length === 0) {
    return { ok: false, error: "Member not found at your facility." };
  }

  const passes: ProfilePass[] = passesDocs.map((pass) => {
    const plan = planOf(pass.membershipPlan);
    const granted = Number(plan?.creditsOffered ?? 0);
    const paid = Math.max(paymentsTotalForPass(pass, paymentsDocs), Number(pass.amountPaid ?? 0));

    return {
      id: pass.id,
      planId: plan?.id ?? null,
      planName: planNameOfPass(pass),
      startDate: pass.startDate ?? null,
      endDate: pass.endDate ?? null,
      isActive: !!pass.endDate && pass.endDate >= now,
      creditsGranted: granted,
      creditsLeft: Number(pass.availableCredits ?? 0),
      amountPaid: paid,
      discountOffered: Number(pass.discountOffered ?? 0),
      due: computePassDue(pass, paymentsDocs),
      tenantName: tenantNameOf(pass.tenant),
    };
  });

  const passById = new Map(passes.map((pass) => [pass.id, pass]));

  const payments: ProfilePayment[] = paymentsDocs.map((payment) => {
    const linkedPassId = linkedPassIdForPayment(payment, passesDocs);
    const linkedPass = linkedPassId ? passById.get(linkedPassId) : null;
    const plan =
      payment.membershipPlan && typeof payment.membershipPlan !== "number"
        ? (payment.membershipPlan as MembershipPlan)
        : null;

    return {
      id: payment.id,
      amount: Number(payment.transactionAmount ?? 0),
      method: payment.paymentMethod ?? "—",
      date: payment.transactionDate ?? payment.createdAt ?? null,
      planName: plan?.planName ?? linkedPass?.planName ?? "Payment",
      linkedPassId: linkedPassId ?? null,
      linkedPassName: linkedPass?.planName ?? null,
    };
  });

  const bookings: ProfileBooking[] = (bookingsRes.docs ?? []).map((booking) => ({
    id: booking.id,
    activity: booking.activity ?? "session",
    court: booking.court ?? "—",
    date: booking.sessionDate ?? null,
    time: booking.sessionTime ?? null,
    status: String(booking.status ?? "").toLowerCase() === "cancelled"
      ? "cancelled"
      : booking.successfulCheckedOutTime
        ? "completed"
        : booking.successfulCheckedInTime
          ? "in-gym"
          : "upcoming",
  }));

  const activePasses = passes.filter((pass) => pass.isActive);

  return {
    ok: true,
    profile: {
      member: {
        id: member.id,
        name: member.fullName?.trim() || "Member",
        phone: member.phone ?? null,
        email: member.email,
        joined: member.createdAt ?? null,
      },
      passes,
      payments,
      bookings,
      totals: {
        activePasses: activePasses.length,
        creditsLeft: activePasses.reduce((sum, pass) => sum + pass.creditsLeft, 0),
        totalPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
        totalDue: passes.reduce((sum, pass) => sum + pass.due, 0),
        unlinkedPayments: payments.filter((payment) => !payment.linkedPassId).length,
      },
    },
  };
}
