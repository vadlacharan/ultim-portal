import type { MembershipDoc, MembershipPlan, TransactionDoc } from "./api";

/**
 * Dues are derived from raw components instead of the stored `amountDue` so
 * the portal is always correct and updates the moment a payment is linked:
 *
 *   due = effectivePrice − linkedPayments − discountOffered
 *
 * `effectivePrice` is the plan's discounted price when an offer exists,
 * otherwise the list price. Payments come from the membership's linked
 * transactions (falling back to the stored `amountPaid` for legacy rows).
 */

export function resolveEffectivePrice(
  plan?: Pick<MembershipPlan, "planPrice" | "discountedPrice"> | number | null,
): number {
  if (!plan || typeof plan === "number") return 0;
  const actual = Number(plan.planPrice ?? 0);
  const discounted = plan.discountedPrice != null ? Number(plan.discountedPrice) : null;
  if (discounted != null && discounted > 0 && discounted < actual) return discounted;
  return actual;
}

const transactionIdOf = (value: TransactionDoc | number | null | undefined): number | null => {
  if (!value) return null;
  return typeof value === "object" ? value.id : Number(value);
};

const membershipIdOf = (value: MembershipDoc | number | null | undefined): number | null => {
  if (!value) return null;
  return typeof value === "object" ? value.id : Number(value);
};

/**
 * Total paid toward a pass, counting BOTH link styles exactly once:
 *  - the `transactions.membership` foreign key (the robust link), and
 *  - the legacy `membership.transactions[]` array.
 */
export function paymentsTotalForPass(
  pass: MembershipDoc,
  payments: TransactionDoc[] = [],
): number {
  const legacyIds = new Set(
    (pass.transactions ?? [])
      .map((entry) => transactionIdOf(entry.transaction))
      .filter((id): id is number => id !== null),
  );

  const counted = new Set<number>();
  let total = 0;

  for (const payment of payments) {
    const isLinkedByFk = membershipIdOf(payment.membership) === pass.id;
    const isLinkedLegacy = legacyIds.has(payment.id);
    if (!isLinkedByFk && !isLinkedLegacy) continue;
    if (counted.has(payment.id)) continue;
    counted.add(payment.id);
    total += Number(payment.transactionAmount ?? 0);
  }

  return total;
}

/**
 * Outstanding balance for a pass:
 *   effectivePrice − payments (FK + legacy) − discountOffered
 * Falls back to the stored `amountPaid` for rows with no fetched payments.
 */
export function computePassDue(pass: MembershipDoc, payments: TransactionDoc[] = []): number {
  const plan =
    pass.membershipPlan && typeof pass.membershipPlan !== "number" ? pass.membershipPlan : null;

  const price = resolveEffectivePrice(plan);
  const paid = Math.max(
    paymentsTotalForPass(pass, payments),
    Number(pass.amountPaid ?? 0),
  );
  const discount = Number(pass.discountOffered ?? 0);

  return Math.max(0, price - paid - discount);
}

/** Which pass a payment is linked to (FK first, then legacy array lookup). */
export function linkedPassIdForPayment(
  payment: TransactionDoc,
  passes: MembershipDoc[],
): number | null {
  const viaFk = membershipIdOf(payment.membership);
  if (viaFk) return viaFk;

  for (const pass of passes) {
    const legacyIds = (pass.transactions ?? [])
      .map((entry) => transactionIdOf(entry.transaction))
      .filter((id): id is number => id !== null);
    if (legacyIds.includes(payment.id)) return pass.id;
  }

  return null;
}

export function planNameOfPass(pass: MembershipDoc): string {
  if (pass.membershipPlanName?.trim()) return pass.membershipPlanName.trim();
  if (pass.membershipPlan && typeof pass.membershipPlan !== "number") {
    return pass.membershipPlan.planName ?? `Pass #${pass.id}`;
  }
  return `Pass #${pass.id}`;
}
