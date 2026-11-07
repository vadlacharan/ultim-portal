import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Building,
  Building2,
  CalendarClock,
  LayoutDashboard,
  Receipt,
  ScanLine,
  Settings,
  ShieldCheck,
  Smartphone,
  Target,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { StaffRole } from "./session";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: StaffRole[];
  external?: boolean;
  /** Shown as “Phase N” until the module ships. */
  phase?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const SCANNER_URL =
  process.env.NEXT_PUBLIC_SCANNER_URL ?? "https://facility-pass-pro.vercel.app";

export function navGroupsFor(role: StaffRole): NavGroup[] {
  const workspace: NavItem[] = [
    { title: "Bookings", href: "/app/bookings", icon: CalendarClock, roles: ["admin", "partner", "consultant"] },
    { title: "Members", href: "/app/members", icon: Users, roles: ["admin", "partner", "consultant"] },
    { title: "Activate member", href: "/app/activate", icon: UserPlus, roles: ["admin", "partner", "consultant"] },
    { title: "Transactions", href: "/app/transactions", icon: Receipt, roles: ["admin", "partner", "consultant"] },
    { title: "Plans", href: "/app/plans", icon: BadgePercent, roles: ["admin", "partner"] },
    { title: "Leads", href: "/app/leads", icon: Target, roles: ["admin", "partner", "consultant"] },
    { title: "Employees", href: "/app/employees", icon: UserCog, roles: ["admin", "partner"] },
    { title: "Facility", href: "/app/facility", icon: Building2, roles: ["admin", "partner"] },
  ];

  const insights: NavItem[] = [
    { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  ];

  const admin: NavItem[] = [
    { title: "Tenants", href: "/app/tenants", icon: Building, roles: ["admin"] },
    { title: "Users & roles", href: "/app/users", icon: ShieldCheck, roles: ["admin"] },
    { title: "App releases", href: "/app/app-releases", icon: Smartphone, roles: ["admin"] },
  ];

  const utilities: NavItem[] = [
    { title: "Gate scanner", href: SCANNER_URL, icon: ScanLine, external: true },
    { title: "Settings", href: "/app/settings", icon: Settings },
  ];

  const filter = (items: NavItem[]) =>
    items.filter((item) => !item.roles || item.roles.includes(role));

  return [
    { label: "Workspace", items: filter(workspace) },
    { label: "Insights", items: filter(insights) },
    ...(filter(admin).length ? [{ label: "Administration", items: filter(admin) }] : []),
    { label: "Utilities", items: filter(utilities) },
  ];
}
