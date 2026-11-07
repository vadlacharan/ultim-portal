"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { Button } from "@/components/ui/button";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { payload, type MembershipPlan, type Tenant } from "@/lib/api";
import { PlanForm } from "../plan-form";
import type { PlanInput } from "@/lib/portal/actions/plans";

export default function EditPlanPage() {
  const searchParams = useSearchParams();
  const planId = Number(searchParams.get("id"));

  const { data, loading, user } = usePortalQuery(
    async ({ user, token }) => {
      if (!Number.isFinite(planId)) return null;
      const plan = await payload.get<MembershipPlan>(
        "membership-plans",
        planId,
        { depth: 0 },
        token,
      );
      const planTenantId =
        typeof plan.tenant === "object" && plan.tenant !== null ? plan.tenant.id : plan.tenant;

      if (user.role !== "admin" && planTenantId && planTenantId !== user.tenantId) {
        return null;
      }

      let tenant: Tenant | null = null;
      if (planTenantId) {
        tenant = await payload
          .get<Tenant>("tenants", planTenantId, { depth: 0 }, token)
          .catch(() => null);
      }

      return { plan, tenant };
    },
    [planId],
  );

  if (loading && !data) return <PageSkeleton cards={2} rows={6} />;

  if (!data) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Plan not found"
        description="It may belong to another facility or have been removed."
        action={
          <Button asChild size="sm">
            <Link href="/app/plans">All plans</Link>
          </Button>
        }
      />
    );
  }

  const { plan, tenant } = data;
  const activityOptions = (tenant?.activities ?? [])
    .filter((activity) => activity.active !== false)
    .map((activity) => String(activity.activity).toLowerCase());
  const mergedOptions = Array.from(
    new Set([...activityOptions, ...(plan.supportedActivities ?? [])]),
  );

  const initial: PlanInput = {
    planName: plan.planName ?? "",
    description: plan.description ?? "",
    category: (plan.category ?? "fitness") as PlanInput["category"],
    supportedActivities: plan.supportedActivities ?? [],
    planPrice: Number(plan.planPrice ?? 0),
    discountedPrice: plan.discountedPrice != null ? Number(plan.discountedPrice) : null,
    MembershipPlanMaximumDiscount: Number(plan.MembershipPlanMaximumDiscount ?? 0),
    Duration: (plan.Duration ?? "1") as PlanInput["Duration"],
    creditsOffered: Number(plan.creditsOffered ?? 0),
    maxMembers: plan.maxMembers != null ? Number(plan.maxMembers) : null,
    numberOfMinutesPerDay:
      plan.numberOfMinutesPerDay != null ? Number(plan.numberOfMinutesPerDay) : null,
    timeSlots: (plan.timeSlots ?? [])
      .map((slot) => slot.slotStartTime)
      .filter((slot): slot is string => Boolean(slot)),
    active: plan.active !== false,
  };

  const readOnly = user?.role === "consultant";

  return (
    <>
      <PageHeader
        title={plan.planName}
        description={
          readOnly
            ? "View-only for consultants."
            : "Changes apply to activations made after saving."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/plans">
              <ArrowLeft className="size-4" />
              All plans
            </Link>
          </Button>
        }
      />
      <PlanForm
        mode="edit"
        planId={planId}
        initial={initial}
        activityOptions={mergedOptions}
      />
    </>
  );
}
