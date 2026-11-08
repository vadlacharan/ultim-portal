"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { ListToolbar } from "@/components/portal/list-toolbar";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { UserRoleSelect, UserTenantSelect } from "@/components/portal/user-controls";
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
import { useAuth } from "@/components/portal/auth-provider";
import { payload, type PayloadUser, type Tenant } from "@/lib/api";
import { formatDate, initialsOf } from "@/lib/format";
import { combineWhere } from "@/lib/where-utils";

const PAGE_SIZE = 15;

export default function UsersPage() {
  const { isAdmin } = useRequireAdmin();
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const q = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "all";

  const { data, loading } = usePortalQuery(
    async ({ token }) => {
      const where = combineWhere(
        role !== "all" ? { field: "role", op: "equals", value: role } : undefined,
        q.trim()
          ? {
              or: [
                { field: "fullName", op: "like", value: q.trim() },
                { field: "email", op: "like", value: q.trim() },
                { field: "phone", op: "like", value: q.trim() },
              ],
            }
          : undefined,
      );

      const [users, tenants] = await Promise.all([
        payload.list<PayloadUser>(
          "users",
          { where, page, limit: PAGE_SIZE, sort: "-createdAt", depth: 1 },
          token,
        ),
        payload.list<Tenant>("tenants", { limit: 100, depth: 0, sort: "Facility" }, token),
      ]);

      return {
        users,
        tenantOptions: (tenants.docs ?? []).map((tenant) => ({
          id: tenant.id,
          name: tenant.Facility ?? `Facility #${tenant.id}`,
        })),
      };
    },
    [page, q, role],
  );

  if (!isAdmin) return null;
  if (loading && !data) return <PageSkeleton cards={3} rows={8} />;
  if (!data) return null;

  const { users, tenantOptions } = data;
  const totalPages = Math.max(1, users.totalPages ?? 1);

  const tenantNameOf = (value: PayloadUser["tenant"]): string | null => {
    if (!value) return null;
    if (typeof value === "object") return value.Facility ?? `Facility #${value.id}`;
    return tenantOptions.find((tenant) => tenant.id === Number(value))?.name ?? null;
  };

  const tenantIdOf = (value: PayloadUser["tenant"]): number | null => {
    if (!value) return null;
    return typeof value === "object" ? value.id : Number(value);
  };

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams(searchParams.toString());
    search.delete("page");
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Every account on the platform — promote partners, bind staff to facilities, spot members."
      />

      <ListToolbar
        searchPlaceholder="Search name, email or phone…"
        filters={[
          {
            key: "role",
            label: "Role",
            options: [
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admins" },
              { value: "partner", label: "Partners" },
              { value: "consultant", label: "Consultants" },
              { value: "member", label: "Members" },
            ],
          },
        ]}
      />

      <div className="mt-4">
        {users.docs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No users match"
            description="Try a different search or role filter."
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    User
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Phone
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Role
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Facility
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Joined
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.docs.map((user) => {
                  const tenantId = tenantIdOf(user.tenant);
                  const isStaff = user.role === "partner" || user.role === "consultant";
                  return (
                    <TableRow
                      key={user.id}
                      className="border-border/40 transition-colors hover:bg-accent"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted-foreground">
                            {initialsOf(user.fullName ?? user.email)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {user.fullName?.trim() || "Unnamed"}
                              {user.id === currentUser?.id && (
                                <Badge variant="secondary" className="ml-2 text-[9px]">
                                  You
                                </Badge>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {user.phone ?? "—"}
                      </TableCell>
                      <TableCell className="py-3">
                        {user.role === "admin" && user.id === currentUser?.id ? (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            admin
                          </Badge>
                        ) : (
                          <UserRoleSelect userId={user.id} role={user.role} />
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {isStaff ? (
                          <UserTenantSelect
                            userId={user.id}
                            tenantId={tenantId}
                            tenants={tenantOptions}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {tenantNameOf(user.tenant) ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {users.docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.totalDocs)} of{" "}
            {users.totalDocs}
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
