import {
  ApiError,
  payload,
  type EmployeeDoc,
  type MembershipDoc,
  type MembershipPlan,
  type PayloadUser,
  type TransactionDoc,
} from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { computePassDue, planNameOfPass } from "@/lib/dues";
import { requireApiAuth, tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

// ─── Member lookup / creation ─────────────────────────────────────────────────

export type MemberSearchResult = {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  hasAccount: boolean;
};

export async function searchMembersAction(query: string): Promise<MemberSearchResult[]> {
  const { token } = await requireApiAuth();
  const q = query.trim();
  if (q.length < 3) return [];

  const res = await payload.list<PayloadUser>(
    "users",
    {
      where: combineWhere(
        { field: "role", op: "equals", value: "member" },
        {
          or: [
            { field: "phone", op: "like", value: q },
            { field: "fullName", op: "like", value: q },
            { field: "email", op: "like", value: q },
          ],
        },
      ),
      limit: 8,
      depth: 0,
      sort: "-updatedAt",
    },
    token,
  );

  return (res.docs ?? []).map((user) => ({
    id: user.id,
    name: user.fullName?.trim() || "Unnamed member",
    phone: user.phone ?? null,
    email: user.email,
    hasAccount: true,
  }));
}

export type CreateMemberInput = {
  fullName: string;
  phone: string;
  email?: string;
};

const OTP_EMAIL_DOMAIN = "@otp.local";
const LEGACY_OTP_LOGIN_PASSWORD = "ultim@123";

export async function createMemberAction(
  input: CreateMemberInput,
): Promise<{ ok: boolean; member?: MemberSearchResult; error?: string }> {
  const { token } = await requireApiAuth();

  const fullName = input.fullName?.trim();
  const phone = input.phone?.replace(/\s+/g, "").trim();

  if (!fullName) return { ok: false, error: "Member name is required." };
  if (!/^\d{10}$/.test(phone)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const email = input.email?.trim().toLowerCase() || `${phone}${OTP_EMAIL_DOMAIN}`;

  try {
    const created = await payload.create<PayloadUser>(
      "users",
      {
        fullName,
        phone,
        email,
        role: "member",
        password: LEGACY_OTP_LOGIN_PASSWORD,
        isPhoneVerified: false,
        _verified: true,
      },
      token,
    );

    return {
      ok: true,
      member: {
        id: created.id,
        name: created.fullName?.trim() || fullName,
        phone: created.phone ?? phone,
        email: created.email ?? email,
        hasAccount: true,
      },
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Could not create the member.";
    return {
      ok: false,
      error: /phone|unique/i.test(message)
        ? "A member with this phone number already exists — search for them instead."
        : message,
    };
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function listActivePlansAction(): Promise<MembershipPlan[]> {
  const { token } = await requireApiAuth();
  const res = await payload.list<MembershipPlan>(
    "membership-plans",
    { where: { field: "active", op: "equals", value: true }, limit: 100, depth: 0, sort: "planPrice" },
    token,
  );
  return res.docs ?? [];
}

// ─── Activation (transaction + membership) ────────────────────────────────────

export type ActivateInput = {
  memberId: number;
  memberName: string;
  planId: number;
  planName: string;
  amount: number;
  paymentMethod: "cash" | "card" | "cheque" | "bankTransfer" | "upi";
  discountOffered: number;
  startDateISO: string;
};

export type ActivateResult = {
  ok: boolean;
  error?: string;
  message?: string;
  membershipId?: number;
  transactionId?: number;
};

export async function activateMembershipAction(
  input: ActivateInput,
): Promise<ActivateResult> {
  const { user, token } = await requireApiAuth();

  if (!input.memberId || !input.planId) {
    return { ok: false, error: "Pick a member and a plan first." };
  }
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Enter a valid amount (0 is allowed — collect later)." };
  }
  if (input.discountOffered < 0) {
    return { ok: false, error: "Discount can't be negative." };
  }

  // Find the signed-in consultant's employee row (optional attribution) — only
  // needed when we actually record a payment.
  let consultantEmployeeId: number | undefined;
  if (amount > 0) {
    try {
      const employee = await payload.list<EmployeeDoc>(
        "employee",
        {
          where: combineWhere(tenantScope(user), {
            field: "employee",
            op: "equals",
            value: user.id,
          }),
          limit: 1,
          depth: 0,
        },
        token,
      );
      consultantEmployeeId = employee.docs?.[0]?.id;
    } catch {
      consultantEmployeeId = undefined;
    }
  }

  // Create the pass first (no array writes — payments link via FK).
  let membership: MembershipDoc;
  try {
    membership = await payload.create<MembershipDoc>(
      "memberships",
      {
        member: input.memberId,
        membershipPlan: input.planId,
        startDate: input.startDateISO,
        discountOffered: input.discountOffered,
      },
      token,
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not activate the membership.",
    };
  }

  // ₹0 activations skip the payment entirely — full amount stays due.
  if (amount > 0) {
    try {
      await payload.create<TransactionDoc>(
        "transactions",
        {
          member: input.memberId,
          membership: membership.id,
          membershipPlan: input.planId,
          transactionAmount: amount,
          paymentMethod: input.paymentMethod,
          transactionDate: new Date().toISOString(),
          ...(consultantEmployeeId ? { Consultant: consultantEmployeeId } : {}),
        },
        token,
      );
    } catch {
      return {
        ok: true,
        membershipId: membership.id,
        message:
          "Pass activated, but the payment could not be recorded — collect it via Collect payment.",
      };
    }
  }

  return {
    ok: true,
    membershipId: membership.id,
    message:
      amount > 0
        ? "Membership activated"
        : "Pass activated — no payment collected, full amount due",
  };
}

// ─── Passes, dues & payments ─────────────────────────────────────────────────

export type MemberPass = {
  id: number;
  planId: number | null;
  planName: string;
  endDate: string | null;
  amountDue: number;
  availableCredits: number;
  isActive: boolean;
};

/** The member's passes (active first) with dues — drives the payment target picker. */
export async function listMemberPassesAction(memberId: number): Promise<MemberPass[]> {
  const { user, token } = await requireApiAuth();
  if (!memberId) return [];

  const [res, paymentsRes] = await Promise.all([
    payload.list<MembershipDoc>(
      "memberships",
      {
        where: combineWhere(tenantScope(user), { field: "member", op: "equals", value: memberId }),
        depth: 2, // resolve the plan (+ legacy array links)
        limit: 50,
        sort: "-endDate",
      },
      token,
    ),
    payload.list<TransactionDoc>(
      "transactions",
      {
        where: combineWhere(tenantScope(user), { field: "member", op: "equals", value: memberId }),
        depth: 0,
        limit: 300,
      },
      token,
    ),
  ]);

  const payments = paymentsRes.docs ?? [];
  const now = new Date().toISOString();
  return (res.docs ?? []).map((pass) => {
    const plan =
      pass.membershipPlan && typeof pass.membershipPlan !== "number" ? pass.membershipPlan : null;
    return {
      id: pass.id,
      planId: plan?.id ?? null,
      planName: planNameOfPass(pass),
      endDate: pass.endDate ?? null,
      amountDue: computePassDue(pass, payments),
      availableCredits: Number(pass.availableCredits ?? 0),
      isActive: !!pass.endDate && pass.endDate >= now,
    };
  });
}

export type MemberSnapshot = {
  activePasses: number;
  creditsLeft: number;
  dues: number;
};

/** Compact context shown after picking a member in the wizard. */
export async function memberSnapshotAction(memberId: number): Promise<MemberSnapshot> {
  const passes = await listMemberPassesAction(memberId);
  return {
    activePasses: passes.filter((pass) => pass.isActive).length,
    creditsLeft: passes
      .filter((pass) => pass.isActive)
      .reduce((sum, pass) => sum + pass.availableCredits, 0),
    dues: passes.reduce((sum, pass) => sum + pass.amountDue, 0),
  };
}

export type SettlePassInput = {
  membershipId: number;
  amount: number;
  paymentMethod: ActivateInput["paymentMethod"];
  /** Due shown to the desk — used to report the new balance instantly. */
  currentDue?: number;
};

/**
 * Collects a payment against an existing (possibly expired) pass. Links the
 * transaction into `membership.transactions[]` so the backend hook recomputes
 * amountPaid / amountDue automatically.
 */
export async function settlePassDueAction(
  input: SettlePassInput,
): Promise<{ ok: boolean; error?: string; message?: string; newDue?: number }> {
  const { token } = await requireApiAuth();

  if (!input.membershipId) return { ok: false, error: "Pick a pass to settle." };
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }

  // One write: the payment itself carries the pass FK, and the backend hook
  // recomputes the pass totals. Nothing can overwrite other links.
  let pass: MembershipDoc;
  try {
    pass = await payload.get<MembershipDoc>(
      "memberships",
      input.membershipId,
      { depth: 0 },
      token,
    );
  } catch {
    return { ok: false, error: "Pass not found." };
  }

  const memberId =
    typeof pass.member === "object" && pass.member ? pass.member.id : pass.member;
  const planId =
    typeof pass.membershipPlan === "object" && pass.membershipPlan
      ? pass.membershipPlan.id
      : pass.membershipPlan;
  if (!memberId) return { ok: false, error: "This pass has no member attached." };

  try {
    await payload.create<TransactionDoc>(
      "transactions",
      {
        member: memberId,
        membership: input.membershipId,
        membershipPlan: planId ?? undefined,
        transactionAmount: amount,
        paymentMethod: input.paymentMethod,
        transactionDate: new Date().toISOString(),
      },
      token,
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not record the payment.",
    };
  }

  const newDue =
    input.currentDue != null ? Math.max(0, Number(input.currentDue) - amount) : undefined;

  return {
    ok: true,
    message:
      newDue == null
        ? "Payment recorded"
        : newDue === 0
          ? "Payment recorded — pass fully settled"
          : `Payment recorded — ${newDue} still due`,
    newDue,
  };
}

// ─── Payments on an existing member (no pass linked) ─────────────────────────

/**
 * Allocates an existing payment to a pass (or moves it between passes).
 * Removes the transaction from any other pass first so `amountPaid` never
 * double-counts, then links it into the target pass's ledger — the backend
 * hook recalculates paid/due on each touched pass.
 */
export async function allocatePaymentAction(
  transactionId: number,
  targetMembershipId: number | null,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const { user, token } = await requireApiAuth();
  const txId = Number(transactionId);

  let transaction: TransactionDoc;
  try {
    transaction = await payload.get<TransactionDoc>("transactions", txId, { depth: 0 }, token);
  } catch {
    return { ok: false, error: "Payment not found." };
  }

  const txMemberId =
    typeof transaction.member === "object" && transaction.member
      ? transaction.member.id
      : transaction.member;
  if (!txMemberId) return { ok: false, error: "This payment has no member attached." };

  // The target pass must belong to the same member.
  if (targetMembershipId != null) {
    try {
      const pass = await payload.get<MembershipDoc>(
        "memberships",
        targetMembershipId,
        { depth: 0 },
        token,
      );
      const passMemberId =
        typeof pass.member === "object" && pass.member ? pass.member.id : pass.member;
      if (String(passMemberId) !== String(txMemberId)) {
        return { ok: false, error: "That pass doesn't belong to this member." };
      }
    } catch {
      return { ok: false, error: "Pass not found." };
    }
  }

  try {
    // One write on the payment itself — the backend hook recomputes both the
    // previous and the new pass. No array replacement, nothing can be wiped.
    await payload.update<TransactionDoc>(
      "transactions",
      txId,
      { membership: targetMembershipId ?? null },
      token,
    );

    // Legacy cleanup: if an OLD array link points at a different pass, remove
    // it so the payment isn't counted twice.
    const passes = await fetchAll<MembershipDoc>(
      "memberships",
      {
        where: combineWhere(tenantScope(user), { field: "member", op: "equals", value: txMemberId }),
        depth: 0,
      },
      token,
      5,
    );

    for (const pass of passes) {
      if (pass.id === targetMembershipId) continue;
      const legacyIds = (pass.transactions ?? [])
        .map((entry) =>
          typeof entry.transaction === "object" && entry.transaction
            ? entry.transaction.id
            : entry.transaction,
        )
        .filter(Boolean)
        .map(Number);
      if (!legacyIds.includes(txId)) continue;

      await payload.update<MembershipDoc>(
        "memberships",
        pass.id,
        {
          transactions: legacyIds
            .filter((id) => id !== txId)
            .map((id) => ({ transaction: id })),
        },
        token,
      );
    }

    return {
      ok: true,
      message: targetMembershipId != null ? "Payment linked to the pass" : "Payment unlinked",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the payment.",
    };
  }
}

export type RecordPaymentInput = {
  memberId: number;
  planId?: number | null;
  membershipId?: number | null;
  amount: number;
  paymentMethod: ActivateInput["paymentMethod"];
  /** Due shown to the desk — passed through to the settle flow. */
  currentDue?: number;
  note?: string;
};

export async function recordPaymentAction(
  input: RecordPaymentInput,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  // Payments targeted at a pass go through the settlement flow so the pass's
  // amountPaid / amountDue are recalculated by the backend hook.
  if (input.membershipId) {
    return settlePassDueAction({
      membershipId: input.membershipId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      currentDue: input.currentDue,
    });
  }

  const { token } = await requireApiAuth();

  if (!input.memberId) return { ok: false, error: "Member is required." };
  if (!input.amount || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }

  try {
    await payload.create<TransactionDoc>(
      "transactions",
      {
        member: input.memberId,
        ...(input.planId ? { membershipPlan: input.planId } : {}),
        transactionAmount: input.amount,
        paymentMethod: input.paymentMethod,
        transactionDate: new Date().toISOString(),
      },
      token,
    );
    return { ok: true, message: "Payment recorded" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not record the payment.",
    };
  }
}
