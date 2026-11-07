"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  DoorOpen,
  LogIn,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { AsyncAction } from "@/components/portal/async-action";
import { BookingsDatePicker } from "@/components/portal/bookings-date-picker";
import {
  BookingsPlanFilter,
  type PlanFilterOption,
} from "@/components/portal/bookings-plan-filter";
import { EmptyState } from "@/components/portal/empty-state";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  payload,
  type BookingDoc,
  type MembershipDoc,
  type MembershipPlan,
  type PayloadUser,
  type Tenant,
} from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { istDateString } from "@/lib/dates";
import { formatNumber, formatTime12h, initialsOf } from "@/lib/format";
import { usePortalRefresh } from "@/lib/portal-refresh";
import { tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

const GYM_ALL_DAY = "GYM_ALL_DAY";

function shiftDate(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T12:00:00+05:30`);
  date.setDate(date.getDate() + days);
  return istDateString(date);
}

function prettyDate(dateISO: string): string {
  const today = istDateString();
  const tomorrow = shiftDate(today, 1);
  const yesterday = shiftDate(today, -1);
  if (dateISO === today) return "Today";
  if (dateISO === tomorrow) return "Tomorrow";
  if (dateISO === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${dateISO}T12:00:00+05:30`));
}

const memberOf = (value: BookingDoc["member"] | MembershipDoc["member"]): PayloadUser | null =>
  value && typeof value !== "number" ? (value as PayloadUser) : null;

export default function BookingsPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date");
  const today = istDateString();
  const dateISO =
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") && dateParam! <= today
      ? dateParam!
      : today;
  const activityParam = searchParams.get("activity") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const courtParam = searchParams.get("court") ?? undefined;
  const planParam = searchParams.get("plan") ?? undefined;
  const planId = planParam && planParam !== "all" ? Number(planParam) : undefined;

  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    setError(null);
    const scope = tenantScope(user);

    try {
      const [tenantDoc, planRows, planPassRows] = await Promise.all([
        user.tenantId
          ? payload.get<Tenant>("tenants", user.tenantId, { depth: 0 }, token).catch(() => null)
          : Promise.resolve(null),
        payload.list<MembershipPlan>(
          "membership-plans",
          { where: scope ?? undefined, limit: 100, depth: 0, sort: "planName" },
          token,
        ),
        planId && Number.isFinite(planId)
          ? fetchAll<MembershipDoc>(
              "memberships",
              {
                where: combineWhere(scope, {
                  field: "membershipPlan",
                  op: "equals",
                  value: planId,
                }),
                depth: 0,
              },
              token,
              10,
            )
          : Promise.resolve([] as MembershipDoc[]),
      ]);

      const planMembershipIds =
        planId && Number.isFinite(planId) ? planPassRows.map((pass) => pass.id) : undefined;
      const canQueryBookings = !planMembershipIds || planMembershipIds.length > 0;

      const bookingRows = canQueryBookings
        ? await fetchAll<BookingDoc>(
            "bookings",
            {
              where: combineWhere(
                scope,
                {
                  field: "sessionDate",
                  op: "greater_than_equal",
                  value: `${dateISO}T00:00:00.000+05:30`,
                },
                {
                  field: "sessionDate",
                  op: "less_than_equal",
                  value: `${dateISO}T23:59:59.999+05:30`,
                },
                activityParam && activityParam !== "all"
                  ? { field: "activity", op: "equals", value: activityParam }
                  : undefined,
                courtParam && courtParam !== "all"
                  ? { field: "court", op: "equals", value: courtParam }
                  : undefined,
                planMembershipIds
                  ? { field: "membership", op: "in", value: planMembershipIds }
                  : undefined,
              ),
              depth: 1,
              select: {
                member: true,
                activity: true,
                court: true,
                sessionDate: true,
                sessionTime: true,
                duration: true,
                status: true,
                qrCode: true,
                successfulCheckedInTime: true,
                successfulCheckedOutTime: true,
              },
              sort: "sessionTime",
            },
            token,
            5,
          )
        : [];

      setBookings(bookingRows);
      setTenant(tenantDoc);
      setPlans(planRows.docs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [user, token, dateISO, activityParam, courtParam, planId]);

  useEffect(() => {
    void load();
  }, [load]);

  usePortalRefresh(load);

  const rates = useMemo(() => {
    const map = new Map<string, number>();
    (tenant?.activities ?? []).forEach((activity) => {
      map.set(
        String(activity.activity).toLowerCase(),
        Number(activity.creditsPer60Minutes ?? 1),
      );
    });
    return map;
  }, [tenant]);

  const activityOptions = useMemo(
    () =>
      Array.from(
        new Set((tenant?.activities ?? []).map((activity) => String(activity.activity).toLowerCase())),
      ),
    [tenant],
  );

  const courtOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (tenant?.activities ?? []).flatMap((activity) =>
            (activity.courts ?? []).map((court) => court.name).filter(Boolean),
          ),
        ),
      ),
    [tenant],
  );

  const planOptions = useMemo<PlanFilterOption[]>(() => {
    return plans
      .map((plan) => ({
        value: String(plan.id),
        label: plan.planName || `Plan #${plan.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [plans]);

  const enriched = useMemo(
    () =>
      bookings.map((booking) => {
        const startAt = booking.successfulCheckedInTime;
        const endAt = booking.successfulCheckedOutTime;
        const cancelled = String(booking.status ?? "").toLowerCase() === "cancelled";
        const status: "cancelled" | "completed" | "in-gym" | "upcoming" = cancelled
          ? "cancelled"
          : endAt
            ? "completed"
            : startAt
              ? "in-gym"
              : "upcoming";
        const duration = Number(booking.duration ?? 60);
        const rate = rates.get(String(booking.activity ?? "").toLowerCase()) ?? 1;
        const credits = Math.max(1, Math.ceil(duration / 60)) * rate;
        return { booking, status, credits, duration };
      }),
    [bookings, rates],
  );

  const filtered = useMemo(
    () =>
      statusParam && statusParam !== "all"
        ? enriched.filter((item) => item.status === statusParam)
        : enriched,
    [enriched, statusParam],
  );

  const summary = useMemo(
    () => ({
      total: enriched.length,
      upcoming: enriched.filter((item) => item.status === "upcoming").length,
      inFacility: enriched.filter((item) => item.status === "in-gym").length,
      completed: enriched.filter((item) => item.status === "completed").length,
      cancelled: enriched.filter((item) => item.status === "cancelled").length,
    }),
    [enriched],
  );

  const isPartner = user?.role === "partner";
  const canCancel = user?.role === "partner" || user?.role === "consultant";

  const buildHref = (patch: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const next = {
      date: dateISO,
      activity: activityParam,
      status: statusParam,
      court: courtParam,
      plan: planParam,
      ...patch,
    };
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all" && !(key === "date" && value === today)) {
        search.set(key, value);
      }
    });
    const qs = search.toString();
    return `/app/bookings${qs ? `?${qs}` : ""}`;
  };

  const KPIS = [
    { label: "Bookings", value: summary.total, icon: CalendarClock },
    { label: "Upcoming", value: summary.upcoming, icon: CalendarClock },
    { label: "In facility now", value: summary.inFacility, icon: DoorOpen },
    { label: "Completed", value: summary.completed, icon: CircleCheck },
    { label: "Cancelled", value: summary.cancelled, icon: CalendarX2 },
  ];

  if (loading && bookings.length === 0) {
    return <PageSkeleton cards={5} rows={6} />;
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        description="The day's schedule across your courts and floors — check members in or out from here."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Day navigation */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="surface-glass flex items-center gap-1 rounded-full p-1">
          <Button asChild variant="ghost" size="icon" className="size-8 rounded-full">
            <Link href={buildHref({ date: shiftDate(dateISO, -1) })} aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-[130px] text-center text-sm font-medium">
            {prettyDate(dateISO)}
          </span>
          {dateISO < today ? (
            <Button asChild variant="ghost" size="icon" className="size-8 rounded-full">
              <Link href={buildHref({ date: shiftDate(dateISO, 1) })} aria-label="Next day">
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              disabled
              aria-label="Next day unavailable"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>

        <BookingsDatePicker value={dateISO} max={today} />

        {dateISO !== today && (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref({ date: undefined })}>Jump to today</Link>
          </Button>
        )}

        <BookingsPlanFilter value={planParam ?? "all"} options={planOptions} />

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ activity: undefined, status: undefined })}
            className={
              !activityParam && !statusParam
                ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1.5 text-xs text-primary"
                : "rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            All
          </Link>
          {activityOptions.map((activity) => (
            <Link
              key={activity}
              href={buildHref({ activity })}
              className={
                activityParam === activity
                  ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1.5 text-xs capitalize text-primary"
                  : "rounded-full border border-border/70 px-3 py-1.5 text-xs capitalize text-muted-foreground hover:text-foreground"
              }
            >
              {activity}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-border/60" />
          {(["upcoming", "in-gym", "completed", "cancelled"] as const).map((status) => (
            <Link
              key={status}
              href={buildHref({ status })}
              className={
                statusParam === status
                  ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1.5 text-xs text-primary"
                  : "rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {status === "in-gym" ? "in facility" : status}
            </Link>
          ))}
        </div>

        {courtOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Courts
            </span>
            <Link
              href={buildHref({ court: undefined })}
              className={
                !courtParam || courtParam === "all"
                  ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1.5 text-xs text-primary"
                  : "rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              All
            </Link>
            {courtOptions.map((court) => (
              <Link
                key={court}
                href={buildHref({ court })}
                className={
                  courtParam === court
                    ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1.5 text-xs text-primary"
                    : "rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {court}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {KPIS.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/60 bg-card/60">
            <CardContent className="flex items-center gap-3 pt-4">
              <Icon className="size-4 text-primary" />
              <div>
                <p className="text-lg font-semibold leading-none">{formatNumber(value)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking rows */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No bookings for this day"
          description="Sessions booked by members on the app will appear here in time order."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(({ booking, status, credits, duration }) => {
            const member = memberOf(booking.member);
            const isAllDay = booking.sessionTime === GYM_ALL_DAY;
            const statusBadge = {
              cancelled: { label: "Cancelled", className: "bg-destructive/12 text-destructive" },
              completed: { label: "Completed", className: "bg-white/8 text-muted-foreground" },
              "in-gym": {
                label: "In facility",
                className: "bg-[var(--success)]/12 text-[var(--success)]",
              },
              upcoming: { label: "Upcoming", className: "bg-primary/12 text-primary" },
            }[status];

            return (
              <div
                key={booking.id}
                className="surface-glass flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3.5"
              >
                <div className="w-20 shrink-0">
                  <p className="text-sm font-semibold tabular-nums">
                    {isAllDay ? "All day" : formatTime12h(booking.sessionTime)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {duration} min
                  </p>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-muted-foreground">
                    {initialsOf(member?.fullName ?? member?.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member ? (
                        <Link
                          href={`/app/members/view?id=${member.id}`}
                          className="hover:text-primary"
                        >
                          {member.fullName?.trim() || member.email}
                        </Link>
                      ) : (
                        "Member"
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{booking.activity ?? "session"}</span>
                      {booking.court ? ` · ${booking.court}` : ""}
                      {" · "}
                      {credits} credits
                      {member?.phone ? ` · ${member.phone}` : ""}
                    </p>
                  </div>
                </div>

                <Badge className={`border-transparent ${statusBadge.className}`}>
                  {statusBadge.label}
                </Badge>

                {booking.qrCode && status !== "cancelled" && (
                  <span className="hidden font-mono text-[10px] text-muted-foreground/70 lg:block">
                    {booking.qrCode}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {status === "upcoming" && (
                    <AsyncAction
                      portalAction={{
                        action: "bookings.checkInOut",
                        input: { bookingId: booking.id, qrCode: booking.qrCode ?? "" },
                      }}
                      label={isPartner ? "Check in" : "Partner only"}
                      pendingLabel="Checking…"
                      icon={<LogIn className="size-4" />}
                      variant="secondary"
                      disabled={!isPartner}
                      title={
                        isPartner
                          ? "Verify the member at the gate using this booking's QR pass"
                          : "Gate verification is limited to the facility partner account"
                      }
                    />
                  )}
                  {status === "in-gym" && isPartner && (
                    <AsyncAction
                      portalAction={{
                        action: "bookings.checkInOut",
                        input: { bookingId: booking.id, qrCode: booking.qrCode ?? "" },
                      }}
                      label="Check out"
                      pendingLabel="Checking…"
                      icon={<DoorOpen className="size-4" />}
                      variant="secondary"
                    />
                  )}
                  {status === "upcoming" && canCancel && (
                    <AsyncAction
                      portalAction={{
                        action: "bookings.cancel",
                        input: { bookingId: booking.id },
                      }}
                      label="Cancel"
                      icon={<CalendarX2 className="size-4" />}
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      confirmText="Cancel this booking and refund its credits to the member?"
                    />
                  )}
                  {member && (
                    <Button asChild variant="ghost" size="icon" title="Open member profile">
                      <Link href={`/app/members/view?id=${member.id}`}>
                        <UserRound className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
