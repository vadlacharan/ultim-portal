"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgePercent, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
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
import { payload, type MembershipPlan } from "@/lib/api";
import { durationLabel, formatDate, formatINR, formatNumber } from "@/lib/format";
import { combineWhere } from "@/lib/where-utils";
import { tenantScope } from "@/lib/scope";

const PAGE_SIZE = 10;

export default function PlansPage() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const status = searchParams.get("status") ?? "all";
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";
  const duration = searchParams.get("duration") ?? "all";

  const { data: plans, loading, user } = usePortalQuery(
    ({ user, token }) => {
      const where = combineWhere(
        tenantScope(user),
        q.trim() ? { field: "planName", op: "like", value: q.trim() } : undefined,
        status === "active"
          ? { field: "active", op: "equals", value: true }
          : status === "inactive"
            ? { field: "active", op: "equals", value: false }
            : undefined,
        category && category !== "all"
          ? { field: "category", op: "equals", value: category }
          : undefined,
        duration && duration !== "all"
          ? { field: "Duration", op: "equals", value: duration }
          : undefined,
      );

      return payload.list<MembershipPlan>(
        "membership-plans",
        { where, page, limit: PAGE_SIZE, sort: "-updatedAt", depth: 0 },
        token,
      );
    },
    [page, status, q, category, duration],
  );

  if (loading && !plans) return <PageSkeleton cards={4} rows={7} />;

  const docs = plans?.docs ?? [];
  const totalPages = Math.max(1, plans?.totalPages ?? 1);

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status && status !== "all") search.set("status", status);
    if (category && category !== "all") search.set("category", category);
    if (duration && duration !== "all") search.set("duration", duration);
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/plans${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Membership plans"
        description="What your desk sells — credits, duration, pricing and the activities each plan unlocks."
        actions={
          user?.role !== "consultant" && (
            <Button asChild size="sm">
              <Link href="/app/plans/new">
                <Plus className="size-4" />
                New plan
              </Link>
            </Button>
          )
        }
      />

      <ListToolbar
        searchPlaceholder="Search plans…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "all", label: "All plans" },
              { value: "active", label: "Active only" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          {
            key: "category",
            label: "Category",
            options: [
              { value: "all", label: "All categories" },
              { value: "fitness", label: "Fitness" },
              { value: "sports", label: "Sports" },
              { value: "health", label: "Health" },
            ],
          },
          {
            key: "duration",
            label: "Duration",
            options: [
              { value: "all", label: "Any duration" },
              { value: "1", label: "1 month" },
              { value: "3", label: "3 months" },
              { value: "6", label: "6 months" },
              { value: "12", label: "1 year" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        {docs.length === 0 ? (
          <EmptyState
            icon={BadgePercent}
            title={q ? "No plans match your search" : "No membership plans yet"}
            description={
              q
                ? "Try a different search or clear the filters."
                : "Create your first plan to start activating members at the desk."
            }
            action={
              user?.role !== "consultant" && !q ? (
                <Button asChild size="sm">
                  <Link href="/app/plans/new">
                    <Plus className="size-4" />
                    Create plan
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Plan
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Duration
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Credits
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Price
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Updated
                  </TableHead>
                  <TableHead className="h-11 w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((plan) => {
                  const discounted =
                    plan.discountedPrice != null &&
                    plan.planPrice != null &&
                    plan.discountedPrice < plan.planPrice;

                  return (
                    <TableRow
                      key={plan.id}
                      className="border-border/40 transition-colors hover:bg-accent"
                    >
                      <TableCell className="py-3">
                        <p className="font-medium">{plan.planName}</p>
                        <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-muted-foreground">
                          {(plan.supportedActivities ?? []).join(", ") || "No activities"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {durationLabel(plan.Duration)}
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm tabular-nums">
                        {formatNumber(plan.creditsOffered)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        {discounted ? (
                          <span className="flex items-center justify-end gap-2">
                            <span className="font-medium">{formatINR(plan.discountedPrice)}</span>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatINR(plan.planPrice)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-medium">{formatINR(plan.planPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {plan.active ? (
                          <Badge className="border-transparent bg-[var(--success)]/12 text-[var(--success)]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDate(plan.updatedAt)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Button asChild variant="ghost" size="icon" aria-label="Edit plan">
                          <Link href={`/app/plans/edit?id=${plan.id}`}>
                            <Pencil className="size-4" />
                          </Link>
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

      {docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, plans?.totalDocs ?? 0)}{" "}
            of {plans?.totalDocs ?? 0}
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
