"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Receipt, Search } from "lucide-react";
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
  type MembershipPlan,
  type PayloadUser,
  type TransactionDoc,
} from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { istDateString } from "@/lib/dates";
import { formatDateTime, formatINR, titleCase } from "@/lib/format";
import { tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

const PAGE_SIZE = 15;

const memberNameOf = (value: TransactionDoc["member"]): string => {
  if (!value || typeof value === "number") return "Member";
  return (value as PayloadUser).fullName?.trim() || (value as PayloadUser).email || "Member";
};

const planNameOf = (value: TransactionDoc["membershipPlan"]): string =>
  value && typeof value !== "number" ? ((value as MembershipPlan).planName ?? "—") : "—";

const escapeCsv = (value: unknown): string => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const q = searchParams.get("q") ?? "";
  const method = searchParams.get("method") ?? "all";
  const plan = searchParams.get("plan") ?? "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const min = searchParams.get("min") ?? "";
  const max = searchParams.get("max") ?? "";

  const [exporting, setExporting] = useState(false);

  const { data, loading, token } = usePortalQuery(
    async ({ user, token }) => {
      const scope = tenantScope(user);
      let memberIds: number[] | undefined;

      if (q.trim()) {
        const users = await payload.list<PayloadUser>(
          "users",
          {
            where: {
              or: [
                { field: "fullName", op: "like", value: q.trim() },
                { field: "phone", op: "like", value: q.trim() },
                { field: "email", op: "like", value: q.trim() },
              ],
            },
            limit: 50,
            depth: 0,
          },
          token,
        );
        memberIds = users.docs.map((item) => item.id);
      }

      const combineDate = (value: string, end = false) =>
        value ? `${value}T${end ? "23:59:59.999" : "00:00:00.000"}+05:30` : undefined;

      const where = combineWhere(
        scope,
        memberIds ? { field: "member", op: "in", value: memberIds } : undefined,
        method && method !== "all"
          ? { field: "paymentMethod", op: "equals", value: method }
          : undefined,
        plan && plan !== "all"
          ? { field: "membershipPlan", op: "equals", value: Number(plan) }
          : undefined,
        min ? { field: "transactionAmount", op: "greater_than_equal", value: Number(min) } : undefined,
        max ? { field: "transactionAmount", op: "less_than_equal", value: Number(max) } : undefined,
        combineDate(from)
          ? { field: "transactionDate", op: "greater_than_equal", value: combineDate(from)! }
          : undefined,
        combineDate(to, true)
          ? { field: "transactionDate", op: "less_than_equal", value: combineDate(to, true)! }
          : undefined,
      );

      const emptyBySearch = memberIds !== undefined && memberIds.length === 0;

      const plans = await payload.list<MembershipPlan>(
        "membership-plans",
        { where: scope ?? undefined, limit: 100, depth: 0, sort: "planName" },
        token,
      );

      const [transactions, allFiltered] = await Promise.all([
        emptyBySearch
          ? Promise.resolve({ docs: [] as TransactionDoc[], totalDocs: 0, totalPages: 1 })
          : payload.list<TransactionDoc>(
              "transactions",
              { where, page, limit: PAGE_SIZE, sort: "-transactionDate", depth: 2 },
              token,
            ),
        emptyBySearch
          ? Promise.resolve([] as TransactionDoc[])
          : fetchAll<TransactionDoc>(
              "transactions",
              { where, sort: "-transactionDate", depth: 0 },
              token,
              10,
            ),
      ]);

      const totals = allFiltered.reduce(
        (acc, tx) => {
          acc.sum += Number(tx.transactionAmount ?? 0);
          const methodKey = tx.paymentMethod ?? "other";
          acc.byMethod[methodKey] =
            (acc.byMethod[methodKey] ?? 0) + Number(tx.transactionAmount ?? 0);
          return acc;
        },
        { sum: 0, byMethod: {} as Record<string, number> },
      );

      return { transactions, allFiltered, plans, totals, where };
    },
    [page, q, method, plan, from, to, min, max],
  );

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams(searchParams.toString());
    ["from", "to", "min", "max"].forEach((key) => {
      const value = String(formData.get(key) ?? "").trim();
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/app/transactions?${query}` : "/app/transactions");
  };

  const exportCsv = async () => {
    if (!data || !token) return;
    setExporting(true);
    try {
      const rows = await fetchAll<TransactionDoc>(
        "transactions",
        { where: data.where, sort: "-transactionDate", depth: 2 },
        token,
        20,
      );
      const header = ["Date", "Member", "Phone", "Plan", "Method", "Consultant", "Amount"];
      const body = rows.map((tx) => {
        const member = typeof tx.member === "object" && tx.member ? tx.member : null;
        const consultant =
          tx.Consultant && typeof tx.Consultant !== "number"
            ? tx.Consultant.employeeName ??
              (typeof tx.Consultant.employee === "object" && tx.Consultant.employee
                ? (tx.Consultant.employee as PayloadUser).fullName ||
                  (tx.Consultant.employee as PayloadUser).email
                : "")
            : "";
        return [
          formatDateTime(tx.transactionDate),
          memberNameOf(tx.member),
          member?.phone ?? "",
          planNameOf(tx.membershipPlan),
          titleCase(tx.paymentMethod),
          consultant,
          Number(tx.transactionAmount ?? 0),
        ];
      });

      const csv = [header, ...body]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ultim-transactions-${istDateString()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <PageSkeleton cards={4} rows={8} />;
  if (!data) return null;

  const { transactions, allFiltered, plans, totals } = data;
  const totalPages = Math.max(1, transactions.totalPages ?? 1);
  const hasFilters = !!(
    q ||
    (method && method !== "all") ||
    (plan && plan !== "all") ||
    from ||
    to ||
    min ||
    max
  );

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams(searchParams.toString());
    search.delete("page");
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/transactions${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every payment recorded at the desk — with totals, filters and export."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={allFiltered.length === 0 || exporting}
            onClick={() => void exportCsv()}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export CSV
          </Button>
        }
      />

      <ListToolbar
        searchPlaceholder="Search member name, phone or email…"
        filters={[
          {
            key: "method",
            label: "Method",
            options: [
              { value: "all", label: "All methods" },
              { value: "cash", label: "Cash" },
              { value: "upi", label: "UPI" },
              { value: "card", label: "Card" },
              { value: "bankTransfer", label: "Bank transfer" },
              { value: "cheque", label: "Cheque" },
            ],
          },
          {
            key: "plan",
            label: "Plan",
            options: [
              { value: "all", label: "All plans" },
              ...(plans.docs ?? []).map((planDoc) => ({
                value: String(planDoc.id),
                label: planDoc.planName,
              })),
            ],
          },
        ]}
      />

      {/* Date range + totals strip */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form
          key={`${from}-${to}-${min}-${max}`}
          className="flex flex-wrap items-center gap-2"
          onSubmit={applyFilters}
        >
          {q && <input type="hidden" name="q" value={q} />}
          {method && <input type="hidden" name="method" value={method} />}
          {plan && <input type="hidden" name="plan" value={plan} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-9 rounded-lg border border-border/70 bg-transparent pl-9 pr-3 text-sm text-foreground [color-scheme:dark]"
            />
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-9 rounded-lg border border-border/70 bg-transparent px-3 text-sm text-foreground [color-scheme:dark]"
          />
          <input
            type="number"
            name="min"
            defaultValue={min}
            placeholder="Min ₹"
            className="h-9 w-24 rounded-lg border border-border/70 bg-transparent px-3 text-sm text-foreground [color-scheme:dark]"
          />
          <input
            type="number"
            name="max"
            defaultValue={max}
            placeholder="Max ₹"
            className="h-9 w-24 rounded-lg border border-border/70 bg-transparent px-3 text-sm text-foreground [color-scheme:dark]"
          />
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {hasFilters && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/transactions">Clear</Link>
            </Button>
          )}
        </form>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {transactions.totalDocs} records · total{" "}
            <span className="font-medium text-foreground">{formatINR(totals.sum)}</span>
          </span>
          {Object.entries(totals.byMethod)
            .sort(([, a], [, b]) => b - a)
            .map(([methodKey, amount]) => (
              <Badge key={methodKey} variant="outline" className="text-[10px] tabular-nums">
                <span className="capitalize">{titleCase(methodKey)}</span>
                <span className="text-muted-foreground">{formatINR(amount)}</span>
              </Badge>
            ))}
        </div>
      </div>

      <div className="mt-4">
        {transactions.docs.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description={
              hasFilters
                ? "Try widening the date range or clearing the filters."
                : "Payments recorded during activations will appear here."
            }
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Member
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Plan
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Method
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Consultant
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.docs.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-border/40 transition-colors hover:bg-white/[0.03]"
                  >
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {formatDateTime(tx.transactionDate)}
                    </TableCell>
                    <TableCell className="py-3">
                      {typeof tx.member === "object" && tx.member ? (
                        <Link
                          href={`/app/members/view?id=${tx.member.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {memberNameOf(tx.member)}
                        </Link>
                      ) : (
                        <span className="font-medium">{memberNameOf(tx.member)}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {planNameOf(tx.membershipPlan)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {titleCase(tx.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {tx.Consultant && typeof tx.Consultant !== "number"
                        ? tx.Consultant.employeeName ??
                          (typeof tx.Consultant.employee === "object" && tx.Consultant.employee
                            ? (tx.Consultant.employee as PayloadUser).fullName ||
                              (tx.Consultant.employee as PayloadUser).email
                            : "—")
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm font-medium tabular-nums">
                      {formatINR(tx.transactionAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {transactions.docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, transactions.totalDocs)} of {transactions.totalDocs}
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
