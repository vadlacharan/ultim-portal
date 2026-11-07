"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function BookingsDatePicker({
  value,
  max,
}: {
  value: string;
  max: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== max) params.set("date", next);
    else params.delete("date");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <label className="surface-glass flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-xs text-muted-foreground">
      <CalendarDays className="size-3.5" />
      <span className="sr-only">Pick a date (past or today)</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-xs text-foreground outline-none [color-scheme:dark]"
      />
    </label>
  );
}
