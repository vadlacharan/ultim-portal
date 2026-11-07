"use client";

import { BadgePercent } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PlanFilterOption = { value: string; label: string };

export function BookingsPlanFilter({
  value,
  options,
}: {
  value: string;
  options: PlanFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== "all") params.set("plan", next);
    else params.delete("plan");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        <BadgePercent className="size-3" />
        Plan
      </span>
      <Select value={value || "all"} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-auto min-w-[200px] max-w-[300px] gap-2">
          <SelectValue placeholder="All plans" />
        </SelectTrigger>
        <SelectContent className="max-w-[340px]">
          <SelectItem value="all">All plans</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="truncate">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
