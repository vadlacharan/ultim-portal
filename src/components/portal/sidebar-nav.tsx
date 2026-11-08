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
          <p className="arena-eyebrow-muted px-3 pb-2">{group.label}</p>
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
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                    {item.external && <ExternalLink className="ml-auto size-3 opacity-60" />}
                    {!item.external && item.phase && (
                      <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
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
