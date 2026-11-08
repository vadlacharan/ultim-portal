"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { ListToolbar } from "@/components/portal/list-toolbar";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { NewTenantDialog } from "@/components/portal/tenant-dialogs";
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
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { payload, type Tenant } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { combineWhere } from "@/lib/where-utils";

const PAGE_SIZE = 12;

export default function TenantsPage() {
  const { isAdmin } = useRequireAdmin();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const q = searchParams.get("q") ?? "";

  const { data: tenants, loading } = usePortalQuery(
    ({ token }) => {
      const where = combineWhere(
        q.trim() ? { field: "Facility", op: "like", value: q.trim() } : undefined,
      );
      return payload.list<Tenant>(
        "tenants",
        { where, page, limit: PAGE_SIZE, sort: "-createdAt", depth: 1 },
        token,
      );
    },
    [page, q],
  );

  if (!isAdmin) return null;
  if (loading && !tenants) return <PageSkeleton cards={3} rows={8} />;
  if (!tenants) return null;

  const docs = tenants.docs ?? [];
  const totalPages = Math.max(1, tenants.totalPages ?? 1);

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams(searchParams.toString());
    search.delete("page");
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/tenants${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Facilities"
        description="Every tenant on the platform. Open one to edit its profile or attach a partner login."
        actions={<NewTenantDialog />}
      />

      <ListToolbar searchPlaceholder="Search facilities…" />

      <div className="mt-4">
        {docs.length === 0 ? (
          <EmptyState
            icon={Building}
            title={q ? "No facilities match" : "No facilities yet"}
            description="Create the first tenant and attach a partner account to it."
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Facility
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    City
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Activities
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Added
                  </TableHead>
                  <TableHead className="h-11 w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="border-border/40 transition-colors hover:bg-accent"
                  >
                    <TableCell className="py-3">
                      <Link
                        href={`/app/tenants/view?id=${tenant.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {tenant.Facility ?? `Facility #${tenant.id}`}
                      </Link>
                      {tenant.description && (
                        <p className="mt-0.5 line-clamp-1 max-w-[320px] text-xs text-muted-foreground">
                          {tenant.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {tenant.city ?? "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {(tenant.activities ?? []).slice(0, 4).map((activity) => (
                          <Badge
                            key={activity.id ?? activity.activity}
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {activity.activity}
                          </Badge>
                        ))}
                        {(tenant.activities ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">None yet</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/app/tenants/view?id=${tenant.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tenants.totalDocs)} of{" "}
            {tenants.totalDocs}
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
