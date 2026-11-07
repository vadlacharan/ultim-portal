import { ApiError, payload, type MembershipPlan } from "@/lib/api";
import { requireApiAuth } from "@/lib/scope";

export type PlanInput = {
  planName: string;
  description: string;
  category: "fitness" | "sports" | "health";
  supportedActivities: string[];
  planPrice: number;
  discountedPrice: number | null;
  MembershipPlanMaximumDiscount: number;
  Duration: "1" | "3" | "6" | "12";
  creditsOffered: number;
  maxMembers: number | null;
  numberOfMinutesPerDay: number | null;
  timeSlots: string[];
  active: boolean;
};

export type ActionResult = { ok: boolean; error?: string; id?: number };

function validate(input: PlanInput): string | null {
  if (!input.planName?.trim()) return "Plan name is required.";
  if (input.supportedActivities.length === 0) return "Pick at least one supported activity.";
  if (!input.planPrice || input.planPrice <= 0) return "Price must be greater than 0.";
  if (input.discountedPrice != null) {
    if (input.discountedPrice <= 0) return "Discounted price must be greater than 0.";
    if (input.discountedPrice >= input.planPrice) {
      return "Discounted price must be lower than the actual price.";
    }
  }
  if (!input.creditsOffered || input.creditsOffered < 0) return "Credits must be 0 or more.";
  if (input.MembershipPlanMaximumDiscount < 0) return "Max discount can't be negative.";
  return null;
}

function toPayload(input: PlanInput) {
  return {
    planName: input.planName.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    supportedActivities: input.supportedActivities,
    planPrice: input.planPrice,
    discountedPrice: input.discountedPrice,
    MembershipPlanMaximumDiscount: input.MembershipPlanMaximumDiscount,
    Duration: input.Duration,
    creditsOffered: input.creditsOffered,
    maxMembers: input.maxMembers,
    numberOfMinutesPerDay: input.numberOfMinutesPerDay,
    timeSlots: input.timeSlots.map((slotStartTime) => ({ slotStartTime })),
    active: input.active,
  };
}

function assertEditable(role: string) {
  if (role === "consultant") {
    return "Consultants can't manage membership plans.";
  }
  return null;
}

export async function createPlanAction(input: PlanInput): Promise<ActionResult> {
  const { user, token } = await requireApiAuth();
  const denial = assertEditable(user.role);
  if (denial) return { ok: false, error: denial };

  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    const created = await payload.create<MembershipPlan>("membership-plans", toPayload(input), token);
    return { ok: true, id: created.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not create the plan.",
    };
  }
}

export async function updatePlanAction(planId: number, input: PlanInput): Promise<ActionResult> {
  const { user, token } = await requireApiAuth();
  const denial = assertEditable(user.role);
  if (denial) return { ok: false, error: denial };

  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    await payload.update<MembershipPlan>("membership-plans", planId, toPayload(input), token);
    return { ok: true, id: planId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not save the plan.",
    };
  }
}

export async function setPlanActiveAction(planId: number, active: boolean): Promise<ActionResult> {
  const { user, token } = await requireApiAuth();
  const denial = assertEditable(user.role);
  if (denial) return { ok: false, error: denial };

  try {
    await payload.update<MembershipPlan>("membership-plans", planId, { active }, token);
    return { ok: true, id: planId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the plan.",
    };
  }
}
