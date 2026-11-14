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
import { payload, type MembershipPlan } from "@/lib/api";
import { tenantScope } from "@/lib/scope";

export type LeadDetailsState = {
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
  age: lead.age != null ? String(lead.age) : "",
  gender: lead.gender ?? "",
  segment: lead.segment ?? "adult",
  parentName: lead.parentName ?? "",
  parentAge: lead.parentAge != null ? String(lead.parentAge) : "",
  interestedActivity: lead.interestedActivity ?? "",
  interestedPlan: lead.interestedPlan != null ? String(lead.interestedPlan) : "",
  walkInDate: lead.walkInDate ? lead.walkInDate.slice(0, 10) : "",
});

/**
 * Plan picker + activity picker live together so picking a plan can fill the
 * activity automatically (the plan knows which activities it supports).
 */
export function LeadDetailsFields({
  value,
  onChange,
  showWalkInDate,
  idPrefix = "lead",
}: {
  value: LeadDetailsState;
  onChange: (next: LeadDetailsState) => void;
  showWalkInDate: boolean;
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

  const planOptions = useMemo(() => plans ?? [], [plans]);

  const set = (patch: Partial<LeadDetailsState>) => onChange({ ...value, ...patch });

  const onPlanChange = (planId: string) => {
    const plan = planOptions.find((p) => String(p.id) === planId);
    const activity = plan?.supportedActivities?.[0] ?? plan?.type ?? null;
    set({
      interestedPlan: planId,
      // Picking a plan tells us the activity - keep any manual choice if the
      // plan does not declare one.
      interestedActivity: activity ? String(activity).toLowerCase() : value.interestedActivity,
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-age`}>Age</Label>
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
          <Label>Gender</Label>
          <Select value={value.gender || "none"} onValueChange={(next) => set({ gender: next === "none" ? "" : next })}>
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

      <div className="space-y-2">
        <Label>Segment</Label>
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

      {value.segment === "kid" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-parent-name`}>Parent name</Label>
            <Input
              id={`${idPrefix}-parent-name`}
              value={value.parentName}
              onChange={(event) => set({ parentName: event.target.value })}
              placeholder="Anita Sharma"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-parent-age`}>Parent age</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Interested activity</Label>
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
          <Label>Interested plan</Label>
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

      {showWalkInDate ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-walk-in-date`}>Walk-in date</Label>
          <Input
            id={`${idPrefix}-walk-in-date`}
            type="date"
            value={value.walkInDate}
            onChange={(event) => set({ walkInDate: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
