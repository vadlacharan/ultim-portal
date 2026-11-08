"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgePercent,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  CreditCard,
  Receipt,
  ScanLine,
  Target,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import {
  ActivityBarChart,
  PaymentMixChart,
  PeakHoursChart,
} from "@/components/portal/dashboard-charts";
import { DashboardFilters } from "@/components/portal/dashboard-filters";
import { PageHeader } from "@/components/portal/page-header";
import { RevenueChart } from "@/components/portal/revenue-chart";
import { DashboardSkeleton } from "@/components/portal/skeletons/dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { payload, type Tenant } from "@/lib/api";
import { countDocs, getDashboardData, type DashboardData } from "@/lib/dashboard";
import { formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { SCANNER_URL } from "@/lib/nav";
import { usePortalRefresh } from "@/lib/portal-refresh";
import { tenantScope } from "@/lib/scope";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range");
  const days: 7 | 30 | 90 = rangeParam === "7" ? 7 : rangeParam === "90" ? 90 : 30;
  const activityParam = searchParams.get("activity") ?? undefined;
  const activity = activityParam && activityParam !== "all" ? activityParam : undefined;
  const facilityParam = searchParams.get("facility") ?? undefined;
  const selectedFacility =
    user?.role === "admin" && facilityParam && facilityParam !== "all"
      ? Number(facilityParam)
      : undefined;
  const tenantId = Number.isFinite(selectedFacility) ? selectedFacility : undefined;

  const [data, setData] = useState<DashboardData | null>(null);
  const [tenantDocs, setTenantDocs] = useState<Tenant[]>([]);
  const [counts, setCounts] = useState({ plans: 0, employees: 0, tenants: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Facility + activity options (loaded once per session, not per filter change).
  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;

    (async () => {
      try {
        const docs =
          user.role === "admin"
            ? (
                await payload.list<Tenant>(
                  "tenants",
                  {
                    limit: 100,
                    depth: 0,
                    select: { Facility: true, activities: true },
                    sort: "Facility",
                  },
                  token,
                )
              ).docs
            : user.tenantId
              ? [
                  await payload.get<Tenant>(
                    "tenants",
                    user.tenantId,
                    { depth: 0, select: { Facility: true, activities: true } },
                    token,
                  ),
                ]
              : [];

        if (!cancelled) setTenantDocs(docs ?? []);
      } catch {
        if (!cancelled) setTenantDocs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  // Setup checklist counters.
  useEffect(() => {
    if (!user || !token) return;
    const scope = tenantScope(user);
    let cancelled = false;

    Promise.all([
      countDocs("membership-plans", { where: scope }, token),
      countDocs("employee", { where: scope }, token),
      countDocs("tenants", {}, token),
    ])
      .then(([plans, employees, tenants]) => {
        if (!cancelled) setCounts({ plans, employees, tenants });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const load = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getDashboardData(user, token, { days, activity, tenantId });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, token, days, activity, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  usePortalRefresh(load);

  const activities = useMemo(() => {
    const source = selectedFacility
      ? tenantDocs.filter((tenant) => tenant.id === selectedFacility)
      : tenantDocs;
    return Array.from(
      new Set(
        source.flatMap((tenant) =>
          (tenant.activities ?? [])
            .filter((item) => item.active !== false)
            .map((item) => String(item.activity).toLowerCase()),
        ),
      ),
    )
      .sort()
      .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
  }, [tenantDocs, selectedFacility]);

  const facilities = useMemo(
    () =>
      tenantDocs
        .map((tenant) => ({
          value: String(tenant.id),
          label: tenant.Facility ?? `Facility #${tenant.id}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tenantDocs],
  );

  const selectedFacilityName = selectedFacility
    ? tenantDocs.find((tenant) => tenant.id === selectedFacility)?.Facility
    : null;

  const facilityLabel =
    user?.role === "admin"
      ? selectedFacilityName ?? "All facilities"
      : user?.tenantName ?? "Your facility";

  if (!data && loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <p className="text-sm font-medium">Could not load the dashboard</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const { kpis, revenueSeries, activitySeries, peakHours, paymentMix, activity: feed } = data;

  const setupSteps = [
    { label: "Complete your facility profile", href: "/app/facility", done: false },
    { label: "Add activities, courts & credit rates", href: "/app/facility", done: false },
    { label: "Publish your first membership plan", href: "/app/plans", done: counts.plans > 0 },
    {
      label: "Add your front-desk consultants",
      href: "/app/employees",
      done: counts.employees > 0,
    },
    { label: "Activate your first member", href: "/app/activate", done: kpis.activePasses > 0 },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;

  const KPI_CARDS = [
    { label: "Active passes", value: formatNumber(kpis.activePasses), icon: CreditCard },
    { label: `Revenue · ${days}d`, value: formatINR(kpis.revenue), icon: Wallet },
    { label: `Bookings · ${days}d`, value: formatNumber(kpis.bookings), icon: CalendarClock },
    {
      label: `Check-in rate · ${days}d`,
      value: `${Math.round(kpis.checkInRate)}%`,
      icon: ScanLine,
    },
    { label: `New passes · ${days}d`, value: formatNumber(kpis.newMembers), icon: UserPlus },
    { label: "Bookings today", value: formatNumber(kpis.bookingsToday), icon: CalendarCheck },
    { label: "Open leads", value: formatNumber(kpis.openLeads), icon: Target },
    { label: "Dues outstanding", value: formatINR(kpis.duesOutstanding), icon: Receipt },
  ];

  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <PageHeader
        title="Dashboard"
        eyebrow="Control room"
        description={`${facilityLabel} · last ${days} days · cancelled bookings excluded from session metrics.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={SCANNER_URL} target="_blank" rel="noreferrer">
                <ScanLine className="size-4" />
                Gate scanner
                <ArrowUpRight className="size-3.5 opacity-70" />
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/activate">
                <UserPlus className="size-4" />
                Activate member
              </Link>
            </Button>
          </>
        }
      />

      <DashboardFilters
        activities={activities}
        facilities={facilities}
        showFacility={user?.role === "admin"}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div className="min-w-0">
                <p className="arena-eyebrow-muted">
                  {label}
                </p>
                <p className="arena-numeral mt-2 truncate text-[34px] leading-none font-semibold text-foreground">
                  {value}
                </p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card
          className="border-border bg-card xl:col-span-3"
          title="Facility-wide; the activity filter applies to session metrics only."
        >
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Revenue · last {days} days</CardTitle>
            <span className="text-xs text-muted-foreground">{formatINR(kpis.revenue)}</span>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueSeries} />
          </CardContent>
        </Card>

        <Card
          className="border-border bg-card xl:col-span-2"
          title="Facility-wide; the activity filter applies to session metrics only."
        >
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Payment mix</CardTitle>
            <span className="text-xs text-muted-foreground">Collected</span>
          </CardHeader>
          <CardContent>
            <PaymentMixChart data={paymentMix} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Bookings by activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityBarChart data={activitySeries} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Peak booking hours</CardTitle>
          </CardHeader>
          <CardContent>
            <PeakHoursChart data={peakHours} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Getting set up</CardTitle>
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{setupSteps.length}
            </span>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {setupSteps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                {step.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span
                  className={
                    step.done ? "flex-1 truncate text-muted-foreground line-through" : "flex-1 truncate"
                  }
                >
                  {step.label}
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground/40" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {feed.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Payments and activations recorded at the desk will appear here.
              </p>
            ) : (
              feed.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <span
                    className={
                      item.kind === "payment"
                        ? "flex size-8 items-center justify-center rounded-full bg-[rgba(52,211,153,0.12)] text-[var(--success)]"
                        : "flex size-8 items-center justify-center rounded-full bg-[rgba(233,181,76,0.12)] text-gold"
                    }
                  >
                    {item.kind === "payment" ? (
                      <CreditCard className="size-3.5" />
                    ) : (
                      <BadgePercent className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <div className="text-right">
                    {item.amount != null && (
                      <p className="text-sm font-medium">{formatINR(item.amount)}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(item.at)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Bookings board", href: "/app/bookings", icon: CalendarClock },
          { label: "Members directory", href: "/app/members", icon: UserPlus },
          { label: "Membership plans", href: "/app/plans", icon: BadgePercent },
          { label: "Leads pipeline", href: "/app/leads", icon: Target },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="surface-glass group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <item.icon className="size-4 text-primary" />
            <span>{item.label}</span>
            <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
