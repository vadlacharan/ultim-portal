"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Link2,
  Loader2,
  Receipt,
  RefreshCw,
  UserRound,
  Wallet,
} from "lucide-react";
import { AllocatePaymentDialog } from "@/components/portal/allocate-payment-dialog";
import { CollectPaymentDialog } from "@/components/portal/collect-payment-dialog";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatNumber,
  formatTime12h,
  titleCase,
} from "@/lib/format";
import { portalCall } from "@/lib/portal-client";
import type { MemberProfile, ProfilePass } from "@/lib/portal/actions/profile";

/**
 * Member profile — fully client rendered so collecting a payment updates the
 * dues instantly (optimistic from the API response) while the rest refreshes
 * quietly in the background.
 */
export default function MemberProfilePage() {
  const searchParams = useSearchParams();
  const memberId = Number(searchParams.get("id"));

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (!memberId || !Number.isFinite(memberId)) {
        setError("Member not found.");
        setLoading(false);
        return;
      }
      if (background) setRefreshing(true);
      else setLoading(true);

      const res = await portalCall.getMemberProfile(memberId);
      if (!res.ok || !res.profile) {
        if (!background) setError(res.error ?? "Member not found.");
      } else {
        setProfile(res.profile);
        setError(null);
      }

      if (background) setRefreshing(false);
      else setLoading(false);
    },
    [memberId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Instant due update after a collection, then reconcile in background. */
  const applyPassDue = (passId: number, newDue: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const passes = prev.passes.map((pass) =>
        pass.id === passId ? { ...pass, due: newDue } : pass,
      );
      return {
        ...prev,
        passes,
        totals: {
          ...prev.totals,
          totalDue: passes.reduce((sum, pass) => sum + pass.due, 0),
        },
      };
    });
    void load(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-glass rounded-2xl p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="surface-glass space-y-3 rounded-2xl p-5 xl:col-span-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <div className="surface-glass space-y-2 rounded-2xl p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="surface-glass mx-auto max-w-md rounded-2xl px-6 py-14 text-center">
        <CircleAlert className="mx-auto size-6 text-gold" />
        <h2 className="mt-3 text-sm font-semibold">{error ?? "Member not found"}</h2>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/app/members">
            <ArrowLeft className="size-4" />
            Back to members
          </Link>
        </Button>
      </div>
    );
  }

  const { member, passes, payments, bookings, totals } = profile;
  const now = new Date().toISOString();

  const KPIS = [
    { label: "Active passes", value: formatNumber(totals.activePasses), icon: CreditCard },
    { label: "Credits left", value: formatNumber(totals.creditsLeft), icon: Wallet },
    { label: "Total paid", value: formatINR(totals.totalPaid), icon: Receipt },
    { label: "Outstanding", value: formatINR(totals.totalDue), icon: CalendarClock },
  ];

  const passOptions = passes.map((pass) => ({
    id: pass.id,
    planName: pass.planName,
    isActive: pass.isActive,
    due: pass.due,
  }));

  return (
    <>
      <PageHeader
        title={member.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>{member.phone ?? "No phone"}</span>
            <span>·</span>
            <span>{member.email}</span>
            <span>·</span>
            <span>joined {formatDate(member.joined)}</span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                updating…
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/members">
                <ArrowLeft className="size-4" />
                All members
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/activate?member=${member.id}&payment=1`}>Record payment</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/app/activate?member=${member.id}`}>Activate plan</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {KPIS.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
              </div>
              <Icon className="size-4 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Passes + sessions */}
        <div className="space-y-4 xl:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">Membership passes</CardTitle>
              <span className="text-xs text-muted-foreground">{passes.length} total</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {passes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No passes yet — activate one at the desk.
                </p>
              ) : (
                passes.map((pass: ProfilePass) => {
                  const used =
                    pass.creditsGranted > 0
                      ? Math.min(
                          100,
                          Math.round(
                            ((pass.creditsGranted - pass.creditsLeft) / pass.creditsGranted) * 100,
                          ),
                        )
                      : 0;
                  const isActive = pass.endDate ? pass.endDate >= now : false;

                  return (
                    <div key={pass.id} className="surface-glass rounded-xl px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{pass.planName}</p>
                        {isActive ? (
                          <Badge className="border-transparent bg-[var(--success)]/12 text-[var(--success)]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Ended
                          </Badge>
                        )}
                        {pass.due > 0 && (
                          <Badge className="border-transparent bg-gold/15 text-gold">
                            {formatINR(pass.due)} due
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDate(pass.startDate)} → {formatDate(pass.endDate)}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatNumber(pass.creditsLeft)} of{" "}
                            {formatNumber(pass.creditsGranted)} credits left
                          </span>
                          <span>{used}% used</span>
                        </div>
                        <Progress value={used} className="h-1.5" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span>{pass.tenantName}</span>
                        <span>Paid {formatINR(pass.amountPaid)}</span>
                        {pass.discountOffered > 0 && (
                          <span>Discount {formatINR(pass.discountOffered)}</span>
                        )}
                        <span className="ml-auto flex items-center gap-2">
                          {pass.due > 0 && (
                            <CollectPaymentDialog
                              membershipId={pass.id}
                              planName={pass.planName}
                              amountDue={pass.due}
                              onSettled={(result) => applyPassDue(pass.id, result.newDue ?? 0)}
                            />
                          )}
                          {pass.planId && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/app/activate?member=${member.id}&plan=${pass.planId}`}>
                                <RefreshCw className="size-4" />
                                Renew plan
                              </Link>
                            </Button>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent sessions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {bookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                  >
                    <CalendarClock className="size-4 text-muted-foreground" />
                    <span className="capitalize">{booking.activity}</span>
                    <span className="text-xs text-muted-foreground">{booking.court}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(booking.date)}
                      {booking.time ? ` · ${formatTime12h(booking.time)}` : ""}
                    </span>
                    {booking.status === "completed" ? (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        Completed
                      </Badge>
                    ) : booking.status === "in-gym" ? (
                      <Badge className="border-transparent bg-[var(--success)]/12 text-[10px] text-[var(--success)]">
                        In facility
                      </Badge>
                    ) : booking.status === "cancelled" ? (
                      <Badge className="border-transparent bg-destructive/12 text-[10px] text-destructive">
                        Cancelled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Upcoming
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payments — dense single-line rows */}
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Payments</CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatINR(totals.totalPaid)} total
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            {totals.unlinkedPayments > 0 && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-[11px] text-gold">
                <CircleAlert className="size-3.5 shrink-0" />
                <span className="truncate">
                  {totals.unlinkedPayments} payment
                  {totals.unlinkedPayments === 1 ? "" : "s"} not linked to a pass
                </span>
              </div>
            )}

            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payments recorded.
              </p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-accent"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[rgba(52,211,153,0.12)] text-[var(--success)]">
                    <Receipt className="size-3" />
                  </span>
                  <span className="w-16 shrink-0 text-sm font-semibold tabular-nums">
                    {formatINR(payment.amount)}
                  </span>
                  <Badge
                    variant="outline"
                    className="hidden shrink-0 text-[9px] capitalize sm:inline-flex"
                  >
                    {titleCase(payment.method)}
                  </Badge>
                  <span
                    className={
                      payment.linkedPassId
                        ? "min-w-0 flex-1 truncate text-xs text-muted-foreground"
                        : "min-w-0 flex-1 truncate text-xs text-gold"
                    }
                    title={payment.linkedPassName ?? "Not linked to a pass"}
                  >
                    {payment.linkedPassName ?? "Not linked to a pass"}
                  </span>
                  <span className="hidden shrink-0 text-[10px] text-muted-foreground lg:block">
                    {formatDateTime(payment.date)}
                  </span>
                  <AllocatePaymentDialog
                    transactionId={payment.id}
                    amount={payment.amount}
                    passes={passOptions}
                    currentPassId={payment.linkedPassId}
                    compact
                    onAllocated={() => void load(true)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <UserRound className="size-3" />
        Member #{member.id} · <Link2 className="size-3" /> payments link to passes automatically
      </p>
    </>
  );
}
