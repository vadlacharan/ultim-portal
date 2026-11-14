"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_ACTIVITIES, LEAD_GENDERS, LEAD_SEGMENTS } from "@/lib/leads";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { payload, type MembershipPlan, type Tenant } from "@/lib/api";
import { tenantScope } from "@/lib/scope";

export type LeadDetailsState = {
  /** Facility id - admins pick it, partners get their own automatically. */
  tenant: string;
  age: string;
  gender: string;
  segment: string;
  parentName: string;
  parentAge: string;
  interestedActivity: string;
  interestedPlan: string;
  walkInDate: string;
};

export const emptyLeadDetails: LeadDetailsState = {
  tenant: "",
  age: "",
  gender: "",
  segment: "adult",
  parentName: "",
  parentAge: "",
  interestedActivity: "",
  interestedPlan: "",
  walkInDate: "",
};

export const leadDetailsToState = (lead: {
  age?: number | null;
  gender?: string | null;
  segment?: string | null;
  parentName?: string | null;
  parentAge?: number | null;
  interestedActivity?: string | null;
  interestedPlan?: number | null;
  walkInDate?: string | null;
}): LeadDetailsState => ({
  tenant: "",
  age: lead.age != null ? String(lead.age) : "",
  gender: lead.gender ?? "",
  segment: lead.segment ?? "adult",
  parentName: lead.parentName ?? "",
  parentAge: lead.parentAge != null ? String(lead.parentAge) : "",
  interestedActivity: lead.interestedActivity ?? "",
  interestedPlan: lead.interestedPlan != null ? String(lead.interestedPlan) : "",
  walkInDate: lead.walkInDate ? lead.walkInDate.slice(0, 10) : "",
});

export function LeadSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {hint ? <p className="text-[11px] text-muted-foreground/70">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const fieldLabel = "text-xs font-medium text-muted-foreground";

/**
 * Profile + interest block shared by the "new lead" and "edit lead" forms.
 *
 * The plan picker and the activity picker live together because a plan knows
 * which activities it supports — picking a plan fills the activity in.
 */
export function LeadDetailsFields({
  value,
  onChange,
  idPrefix = "lead",
}: {
  value: LeadDetailsState;
  onChange: (next: LeadDetailsState) => void;
  idPrefix?: string;
}) {
  const { data: plans } = usePortalQuery(async ({ user, token }) => {
    const scope = tenantScope(user);
    const res = await payload.list<MembershipPlan>(
      "membership-plans",
      { limit: 100, depth: 0, sort: "-createdAt", ...(scope ? { where: scope } : {}) },
      token,
    );
    return res.docs ?? [];
  }, []);

  const { data: tenants } = usePortalQuery(async ({ user, token }) => {
    if (user.role !== "admin") return [] as Tenant[];
    const res = await payload.list<Tenant>(
      "tenants",
      { limit: 100, depth: 0, sort: "Facility" },
      token,
    );
    return res.docs ?? [];
  }, []);

  const planOptions = useMemo(() => plans ?? [], [plans]);
  const tenantOptions = useMemo(() => tenants ?? [], [tenants]);

  const set = (patch: Partial<LeadDetailsState>) => onChange({ ...value, ...patch });

  const onPlanChange = (planId: string) => {
    const plan = planOptions.find((p) => String(p.id) === planId);
    const activity = plan?.supportedActivities?.[0] ?? plan?.type ?? null;
    set({
      interestedPlan: planId,
      // A plan tells us the activity - keep any manual choice when the plan
      // does not declare one.
      interestedActivity: activity ? String(activity).toLowerCase() : value.interestedActivity,
    });
  };

  const isKid = value.segment === "kid";

  return (
    <div className="space-y-6">
      {tenantOptions.length > 0 ? (
        <LeadSection title="Facility" hint="Which facility is this lead for?">
          <div className="space-y-2">
            <Select
              value={value.tenant || "none"}
              onValueChange={(next) => set({ tenant: next === "none" ? "" : next })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a facility</SelectItem>
                {tenantOptions.map((tenant) => (
                  <SelectItem key={tenant.id} value={String(tenant.id)}>
                    {tenant.Facility ?? `Facility #${tenant.id}`}
                    {tenant.city ? ` — ${tenant.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </LeadSection>
      ) : null}

      <LeadSection title="Profile" hint="Who is this lead?">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className={fieldLabel}>Segment</Label>
            <Select value={value.segment || "adult"} onValueChange={(next) => set({ segment: next })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SEGMENTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={fieldLabel} htmlFor={`${idPrefix}-age`}>
              Age
            </Label>
            <Input
              id={`${idPrefix}-age`}
              type="number"
              min={0}
              max={120}
              value={value.age}
              onChange={(event) => set({ age: event.target.value })}
              placeholder="28"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label className={fieldLabel}>Gender</Label>
            <Select
              value={value.gender || "none"}
              onValueChange={(next) => set({ gender: next === "none" ? "" : next })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {LEAD_GENDERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isKid ? (
          <div className="grid gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className={fieldLabel} htmlFor={`${idPrefix}-parent-name`}>
                Parent name <span className="text-primary">*</span>
              </Label>
              <Input
                id={`${idPrefix}-parent-name`}
                value={value.parentName}
                onChange={(event) => set({ parentName: event.target.value })}
                placeholder="Anita Sharma"
              />
            </div>
            <div className="space-y-2">
              <Label className={fieldLabel} htmlFor={`${idPrefix}-parent-age`}>
                Parent age <span className="text-primary">*</span>
              </Label>
              <Input
                id={`${idPrefix}-parent-age`}
                type="number"
                min={0}
                max={120}
                value={value.parentAge}
                onChange={(event) => set({ parentAge: event.target.value })}
                placeholder="35"
                inputMode="numeric"
              />
            </div>
          </div>
        ) : null}
      </LeadSection>

      <LeadSection title="Interest" hint="What are they asking about?">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={fieldLabel}>Interested activity</Label>
            <Select
              value={value.interestedActivity || "none"}
              onValueChange={(next) => set({ interestedActivity: next === "none" ? "" : next })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {LEAD_ACTIVITIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={fieldLabel}>Interested plan</Label>
            <Select
              value={value.interestedPlan || "none"}
              onValueChange={(next) => onPlanChange(next === "none" ? "" : next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {planOptions.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.planName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </LeadSection>
    </div>
  );
}
