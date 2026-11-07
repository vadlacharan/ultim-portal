"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DashboardFilterOption = { value: string; label: string };

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function DashboardFilters({
  activities,
  facilities,
  showFacility,
}: {
  activities: DashboardFilterOption[];
  facilities: DashboardFilterOption[];
  showFacility: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = searchParams.get("range") ?? "30";
  const activity = searchParams.get("activity") ?? "all";
  const facility = searchParams.get("facility") ?? "all";

  const setParam = (key: string, value: string, defaultValue = "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === defaultValue) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const reset = () => startTransition(() => router.replace(pathname));

  const isFiltered =
    range !== "30" || activity !== "all" || (showFacility && facility !== "all");

  return (
    <div className="surface-glass mb-5 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5">
      <span className="flex items-center gap-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        <SlidersHorizontal className="size-3.5" />
        Filters
      </span>

      <Select value={range} onValueChange={(value) => setParam("range", value, "30")}>
        <SelectTrigger className="h-8 w-auto min-w-[140px] gap-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={activity} onValueChange={(value) => setParam("activity", value)}>
        <SelectTrigger className="h-8 w-auto min-w-[150px] gap-2">
          <SelectValue placeholder="All activities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All activities</SelectItem>
          {activities.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showFacility && (
        <Select value={facility} onValueChange={(value) => setParam("facility", value)}>
          <SelectTrigger className="h-8 w-auto min-w-[170px] gap-2">
            <SelectValue placeholder="All facilities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All facilities</SelectItem>
            {facilities.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isFiltered && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={reset}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      )}

      {pending && (
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Updating…
        </span>
      )}
    </div>
  );
}
