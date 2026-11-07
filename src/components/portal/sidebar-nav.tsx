"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroupsFor } from "@/lib/nav";
import type { StaffRole } from "@/lib/session";

export function SidebarNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const groups = navGroupsFor(role);

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive =
                !item.external &&
                (pathname === item.href || pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/12 font-medium text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                    {item.external && <ExternalLink className="ml-auto size-3 opacity-60" />}
                    {!item.external && item.phase && (
                      <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
                        P{item.phase}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
