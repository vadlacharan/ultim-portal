"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { portalCall } from "@/lib/portal-client";
import type { PlanInput } from "@/lib/portal/actions/plans";

const SLOT_HOURS = [
  "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
  "21:00", "22:00",
];

const DURATIONS = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
] as const;

export function PlanForm({
  mode,
  planId,
  initial,
  activityOptions,
}: {
  mode: "create" | "edit";
  planId?: number;
  initial: PlanInput;
  activityOptions: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlanInput>(initial);
  const [saving, startSaving] = useTransition();

  const update = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleActivity = (activity: string) => {
    setForm((prev) => ({
      ...prev,
      supportedActivities: prev.supportedActivities.includes(activity)
        ? prev.supportedActivities.filter((item) => item !== activity)
        : [...prev.supportedActivities, activity],
    }));
  };

  const toggleSlot = (slot: string) => {
    setForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter((item) => item !== slot)
        : [...prev.timeSlots, slot].sort(),
    }));
  };

  const savings = useMemo(() => {
    if (form.discountedPrice == null) return 0;
    return Math.max(0, form.planPrice - form.discountedPrice);
  }, [form.discountedPrice, form.planPrice]);

  const submit = () => {
    startSaving(async () => {
      const result =
        mode === "create"
          ? await portalCall.createPlan(form)
          : await portalCall.updatePlan(planId as number, form);

      if (!result.ok) {
        toast.error(result.error ?? "Could not save the plan.");
        return;
      }

      toast.success(mode === "create" ? "Plan created" : "Plan saved");
      router.push("/app/plans");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Basics */}
        <Card className="border-border/60 bg-card/60 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Plan basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={form.planName}
                onChange={(event) => update("planName", event.target.value)}
                placeholder="e.g. Hybrid Fitness — 3 Month"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => update("category", value as PlanInput["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["fitness", "sports", "health"].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={form.Duration}
                onValueChange={(value) => update("Duration", value as PlanInput["Duration"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                rows={3}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Short summary shown to members."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-credits">Credits granted</Label>
              <Input
                id="plan-credits"
                type="number"
                min={0}
                value={form.creditsOffered}
                onChange={(event) => update("creditsOffered", Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-minutes">Minutes per day (optional)</Label>
              <Input
                id="plan-minutes"
                type="number"
                min={0}
                value={form.numberOfMinutesPerDay ?? ""}
                onChange={(event) =>
                  update(
                    "numberOfMinutesPerDay",
                    event.target.value === "" ? null : Number(event.target.value),
                  )
                }
                placeholder="e.g. 90"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Pricing</CardTitle>
            {savings > 0 && (
              <Badge className="border-transparent bg-secondary/15 text-secondary">
                SAVE ₹{savings}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="plan-price">Actual price (₹)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                value={form.planPrice || ""}
                onChange={(event) => update("planPrice", Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-discounted">Discounted price (₹)</Label>
              <Input
                id="plan-discounted"
                type="number"
                min={0}
                value={form.discountedPrice ?? ""}
                onChange={(event) =>
                  update("discountedPrice", event.target.value === "" ? null : Number(event.target.value))
                }
                placeholder="Leave empty for no offer"
              />
              <p className="text-[11px] text-muted-foreground">
                Shown to members as the selling price with the actual price struck through.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-max-discount">Max desk discount (₹)</Label>
              <Input
                id="plan-max-discount"
                type="number"
                min={0}
                value={form.MembershipPlanMaximumDiscount}
                onChange={(event) =>
                  update("MembershipPlanMaximumDiscount", Number(event.target.value))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                The most your desk staff can knock off during activation.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Plan active</p>
                <p className="text-[11px] text-muted-foreground">Hidden plans can’t be sold.</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Supported activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {activityOptions.map((activity) => {
              const selected = form.supportedActivities.includes(activity);
              return (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/12 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {activity.charAt(0).toUpperCase() + activity.slice(1)}
                </button>
              );
            })}
            {activityOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add activities to your facility first.
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Credits are shared across the selected activities. Only your facility’s enabled
            activities can be attached to a plan.
          </p>
        </CardContent>
      </Card>

      {/* Slots */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Bookable start times</CardTitle>
          <span className="text-xs text-muted-foreground">
            {form.timeSlots.length} selected
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SLOT_HOURS.map((slot) => {
              const selected = form.timeSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(slot)}
                  className={cn(
                    "w-20 rounded-lg border px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/12 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Leave all unselected to fall back to your facility’s default slot list.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push("/app/plans")} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {mode === "create" ? "Create plan" : "Save plan"}
        </Button>
      </div>
    </div>
  );
}
