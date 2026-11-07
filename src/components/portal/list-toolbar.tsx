"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ToolbarFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function ListToolbar({
  searchPlaceholder = "Search…",
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  // Debounced search → URL (?q=), always resetting to page 1.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (value === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [value, router, pathname, searchParams]);

  const setFilter = (key: string, next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== "all") params.set(key, next);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          <Select
            value={searchParams.get(filter.key) ?? "all"}
            onValueChange={(next) => setFilter(filter.key, next)}
          >
            <SelectTrigger className="h-9 w-auto min-w-[140px] gap-2">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
