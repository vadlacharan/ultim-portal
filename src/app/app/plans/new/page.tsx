"use client";

import { BadgePercent } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { payload, type Tenant } from "@/lib/api";
import { PlanForm } from "../plan-form";
import type { PlanInput } from "@/lib/portal/actions/plans";

const DEFAULTS: PlanInput = {
  planName: "",
  description: "",
  category: "fitness",
  supportedActivities: [],
  planPrice: 0,
  discountedPrice: null,
  MembershipPlanMaximumDiscount: 0,
  Duration: "1",
  creditsOffered: 0,
  maxMembers: null,
  numberOfMinutesPerDay: null,
  timeSlots: [],
  active: true,
};

export default function NewPlanPage() {
  const { data: tenant, loading, user } = usePortalQuery(
    ({ user, token }) =>
      user.tenantId
        ? payload.get<Tenant>("tenants", user.tenantId, { depth: 0 }, token)
        : Promise.resolve(null),
    [],
  );

  if (loading && !tenant) return <PageSkeleton cards={2} rows={6} />;

  if (user?.role === "consultant") {
    return (
      <>
        <PageHeader title="New plan" />
        <EmptyState
          icon={BadgePercent}
          title="View-only for consultants"
          description="Ask the facility partner to create or change membership plans."
        />
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <PageHeader title="New plan" />
        <EmptyState
          icon={BadgePercent}
          title="Pick a tenant first"
          description="Partner accounts create plans for their own facility. Admins can create plans from a facility page."
        />
      </>
    );
  }

  const activityOptions = (tenant.activities ?? [])
    .filter((activity) => activity.active !== false)
    .map((activity) => String(activity.activity).toLowerCase());

  return (
    <>
      <PageHeader
        title="New membership plan"
        description={`Define what ${tenant.Facility ?? "your facility"} sells at the reception desk.`}
      />
      <PlanForm mode="create" initial={DEFAULTS} activityOptions={activityOptions} />
    </>
  );
}
