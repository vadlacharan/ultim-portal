"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { ListToolbar } from "@/components/portal/list-toolbar";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePortalQuery } from "@/hooks/use-portal-query";
import {
  payload,
  type MembershipDoc,
  type MembershipPlan,
  type PayloadUser,
  type TransactionDoc,
} from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { computePassDue } from "@/lib/dues";
import { formatINR, formatNumber } from "@/lib/format";
import { tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

const PAGE_SIZE = 12;

type MemberStats = {
  passes: number;
  activePasses: number;
  credits: number;
  paid: number;
  dues: number;
  latestPlan: string | null;
  latestActive: boolean;
};

const emptyStats = (): MemberStats => ({
  passes: 0,
  activePasses: 0,
  credits: 0,
  paid: 0,
  dues: 0,
  latestPlan: null,
  latestActive: false,
});

export default function MembersPage() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const status = searchParams.get("status") ?? "all";
  const q = searchParams.get("q") ?? "";
  const planParam = searchParams.get("plan") ?? "";
  const activity = searchParams.get("activity") ?? "all";
  const dues = searchParams.get("dues") ?? "all";

  const { data, loading } = usePortalQuery(
    async ({ user, token }) => {
      const scope = tenantScope(user);
      const now = new Date().toISOString();

      const [memberships, plansRes, allPayments] = await Promise.all([
        fetchAll<MembershipDoc>(
          "memberships",
          { where: scope, depth: 1, sort: "-createdAt" },
          token,
          20,
        ),
        payload.list<MembershipPlan>(
          "membership-plans",
          { where: scope ?? undefined, limit: 100, depth: 0, sort: "planName" },
          token,
        ),
        fetchAll<TransactionDoc>(
          "transactions",
          { where: scope, depth: 0, sort: "-transactionDate" },
          token,
          20,
        ),
      ]);

      const paymentsByMember = new Map<number, TransactionDoc[]>();
      for (const payment of allPayments) {
        const memberId = Number(
          typeof payment.member === "object" && payment.member
            ? payment.member.id
            : payment.member,
        );
        if (!memberId) continue;
        if (!paymentsByMember.has(memberId)) paymentsByMember.set(memberId, []);
        paymentsByMember.get(memberId)!.push(payment);
      }

      const plans = plansRes.docs ?? [];
      const plansByActivity = new Map<string, Set<number>>();
      plans.forEach((plan) => {
        (plan.supportedActivities ?? []).forEach((activity) => {
          const key = String(activity).toLowerCase();
          if (!plansByActivity.has(key)) plansByActivity.set(key, new Set());
          plansByActivity.get(key)!.add(plan.id);
        });
      });

      const allIds = new Set<number>();
      const activeIds = new Set<number>();
      const duesIds = new Set<number>();
      const planFilterIds = new Set<number>();
      const activityFilterIds = new Set<number>();

      const planFilterId = planParam ? Number(planParam) : null;
      const activityFilter = activity && activity !== "all" ? activity.toLowerCase() : null;
      const activityPlanIds = activityFilter
        ? plansByActivity.get(activityFilter) ?? new Set<number>()
        : null;

      for (const membership of memberships) {
        const memberId = Number(
          typeof membership.member === "object" && membership.member
            ? membership.member.id
            : membership.member,
        );
        if (!memberId) continue;
        allIds.add(memberId);

        const isActive = !!membership.endDate && membership.endDate >= now;
        if (isActive) activeIds.add(memberId);
        if (computePassDue(membership, paymentsByMember.get(memberId) ?? []) > 0) {
          duesIds.add(memberId);
        }

        const planId = Number(
          typeof membership.membershipPlan === "object" && membership.membershipPlan
            ? membership.membershipPlan.id
            : membership.membershipPlan,
        );
        if (planFilterId && planId === planFilterId) planFilterIds.add(memberId);
        if (activityPlanIds && activityPlanIds.has(planId)) activityFilterIds.add(memberId);
      }

      const activeFilterSets: Set<number>[] = [];
      if (planFilterId) activeFilterSets.push(planFilterIds);
      if (activityFilter) activeFilterSets.push(activityFilterIds);
      if (dues === "1") activeFilterSets.push(duesIds);
      if (status === "active") activeFilterSets.push(activeIds);
      if (status === "expired") {
        activeFilterSets.push(new Set([...allIds].filter((id) => !activeIds.has(id))));
      }

      const filteredIds: number[] | null =
        activeFilterSets.length === 0
          ? null
          : Array.from(
              activeFilterSets.reduce(
                (acc, set) => new Set([...acc].filter((id) => set.has(id))),
              ),
            );

      const idFilter = user.role === "admin" ? undefined : Array.from(allIds);
      const effectiveIds: number[] | undefined = filteredIds ?? idFilter;

      const hasFilters = !!(
        q ||
        planParam ||
        activityFilter ||
        dues === "1" ||
        status !== "all"
      );

      const where = combineWhere(
        { field: "role", op: "equals", value: "member" },
        effectiveIds ? { field: "id", op: "in", value: effectiveIds } : undefined,
        q.trim()
          ? {
              or: [
                { field: "fullName", op: "like", value: q.trim() },
                { field: "phone", op: "like", value: q.trim() },
                { field: "email", op: "like", value: q.trim() },
              ],
            }
          : undefined,
      );

      const canQuery = !effectiveIds || effectiveIds.length > 0;
      const members = canQuery
        ? await payload.list<PayloadUser>(
            "users",
            { where, page, limit: PAGE_SIZE, depth: 0, sort: "-createdAt" },
            token,
          )
        : { docs: [] as PayloadUser[], totalDocs: 0, totalPages: 1 };

      const pageIds = members.docs.map((member) => member.id);
      const pageScope = combineWhere({ field: "member", op: "in", value: pageIds }, scope);

      const [pageMemberships, pageTransactions] = await Promise.all([
        pageIds.length
          ? fetchAll<MembershipDoc>(
              "memberships",
              { where: pageScope, depth: 2, sort: "-createdAt" },
              token,
              5,
            )
          : Promise.resolve([]),
        pageIds.length
          ? fetchAll<TransactionDoc>(
              "transactions",
              { where: pageScope, depth: 0 },
              token,
              5,
            )
          : Promise.resolve([]),
      ]);

      const pagePaymentsByMember = new Map<number, TransactionDoc[]>();
      for (const payment of pageTransactions) {
        const memberId = Number(
          typeof payment.member === "object" && payment.member
            ? payment.member.id
            : payment.member,
        );
        if (!memberId) continue;
        if (!pagePaymentsByMember.has(memberId)) pagePaymentsByMember.set(memberId, []);
        pagePaymentsByMember.get(memberId)!.push(payment);
      }

      const statsByMember = new Map<number, MemberStats>();
      for (const membership of pageMemberships) {
        const memberId = Number(
          typeof membership.member === "object" && membership.member
            ? membership.member.id
            : membership.member,
        );
        const memberPayments = pagePaymentsByMember.get(memberId) ?? [];
        const stats = statsByMember.get(memberId) ?? emptyStats();
        stats.passes += 1;
        const isActive = !!membership.endDate && membership.endDate >= now;
        if (isActive) {
          stats.activePasses += 1;
          stats.credits += Number(membership.availableCredits ?? 0);
        }
        stats.dues += computePassDue(membership, memberPayments);

        if (!stats.latestPlan) {
          stats.latestPlan = membership.membershipPlanName?.trim() || null;
          if (
            !stats.latestPlan &&
            membership.membershipPlan &&
            typeof membership.membershipPlan !== "number"
          ) {
            stats.latestPlan = membership.membershipPlan.planName ?? null;
          }
          stats.latestActive = isActive;
        }
        statsByMember.set(memberId, stats);
      }
      for (const transaction of pageTransactions) {
        const memberId = Number(
          typeof transaction.member === "object" && transaction.member
            ? transaction.member.id
            : transaction.member,
        );
        const stats = statsByMember.get(memberId) ?? emptyStats();
        stats.paid += Number(transaction.transactionAmount ?? 0);
        statsByMember.set(memberId, stats);
      }

      return {
        members,
        statsByMember,
        plans,
        activityOptions: Array.from(plansByActivity.keys()).sort(),
        hasFilters,
      };
    },
    [page, status, q, planParam, activity, dues],
  );

  if (loading && !data) return <PageSkeleton cards={4} rows={8} />;
  if (!data) return null;

  const { members, statsByMember, plans, activityOptions, hasFilters } = data;
  const totalPages = Math.max(1, members.totalPages ?? 1);

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams(searchParams.toString());
    search.delete("page");
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/members${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Members"
        description="Everyone with a pass at your facility — filter by plan, activity, dues and status."
        actions={
          <Button asChild size="sm">
            <Link href="/app/activate">Activate member</Link>
          </Button>
        }
      />

      <ListToolbar
        searchPlaceholder="Search name, phone or email…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "all", label: "All members" },
              { value: "active", label: "Active pass" },
              { value: "expired", label: "No active pass" },
            ],
          },
          {
            key: "plan",
            label: "Plan",
            options: [
              { value: "all", label: "All plans" },
              ...plans.map((plan) => ({ value: String(plan.id), label: plan.planName })),
            ],
          },
          {
            key: "activity",
            label: "Activity",
            options: [
              { value: "all", label: "All activities" },
              ...activityOptions.map((activity) => ({
                value: activity,
                label: activity.charAt(0).toUpperCase() + activity.slice(1),
              })),
            ],
          },
          {
            key: "dues",
            label: "Dues",
            options: [
              { value: "all", label: "Any balance" },
              { value: "1", label: "Has dues only" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        {members.docs.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No members match these filters" : "No members yet"}
            description={
              hasFilters
                ? "Try widening the filters — or clear them to see everyone."
                : "Activate a membership for a new member and they'll appear here."
            }
            action={
              hasFilters ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/members">Clear filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Member
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Latest pass
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Credits
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Paid
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Dues
                  </TableHead>
                  <TableHead className="h-11 w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.docs.map((member) => {
                  const stats = statsByMember.get(member.id);
                  return (
                    <TableRow
                      key={member.id}
                      className="border-border/40 transition-colors hover:bg-white/[0.03]"
                    >
                      <TableCell className="py-3">
                        <Link href={`/app/members/view?id=${member.id}`} className="block">
                          <p className="font-medium">{member.fullName?.trim() || "Unnamed member"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {member.phone ?? member.email}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        {stats?.latestPlan ? (
                          <div className="flex items-center gap-2">
                            <span className="max-w-[180px] truncate text-sm">
                              {stats.latestPlan}
                            </span>
                            {stats.latestActive ? (
                              <Badge className="border-transparent bg-[var(--success)]/12 text-[10px] text-[var(--success)]">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                Expired
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums">
                        {formatNumber(stats?.credits ?? 0)}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums">
                        {formatINR(stats?.paid ?? 0)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {(stats?.dues ?? 0) > 0 ? (
                          <Badge className="border-transparent bg-secondary/15 text-secondary">
                            {formatINR(stats?.dues)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/app/members/view?id=${member.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {members.docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, members.totalDocs)} of{" "}
            {members.totalDocs}
          </p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={buildHref(page - 1)} aria-disabled={page <= 1}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            </Button>
            <span className="min-w-[92px] text-center text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={buildHref(page + 1)} aria-disabled={page >= totalPages}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
