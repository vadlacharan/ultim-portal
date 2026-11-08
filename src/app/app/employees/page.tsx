"use client";

import { useSearchParams } from "next/navigation";
import { UserCog } from "lucide-react";
import { ListToolbar } from "@/components/portal/list-toolbar";
import { EmptyState } from "@/components/portal/empty-state";
import { AddEmployeeDialog, EditEmployeeDialog } from "@/components/portal/employee-dialogs";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { payload, type EmployeeDoc, type PayloadUser, type TransactionDoc } from "@/lib/api";
import { fetchAll } from "@/lib/dashboard";
import { formatDate, formatINR, formatNumber, initialsOf } from "@/lib/format";
import { tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

export default function EmployeesPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const gender = searchParams.get("gender") ?? "all";

  const { data, loading } = usePortalQuery(
    async ({ user, token }) => {
      const scope = tenantScope(user);

      let linkedUserIds: number[] | undefined;
      if (q.trim()) {
        const users = await payload.list<PayloadUser>(
          "users",
          {
            where: combineWhere(
              tenantScope(user),
              {
                or: [
                  { field: "fullName", op: "like", value: q.trim() },
                  { field: "email", op: "like", value: q.trim() },
                ],
              },
            ),
            limit: 100,
            depth: 0,
          },
          token,
        );
        linkedUserIds = users.docs.map((item) => item.id);
      }

      const employeeWhere = combineWhere(
        scope,
        gender && gender !== "all"
          ? { field: "gender", op: "equals", value: gender }
          : undefined,
        q.trim()
          ? {
              or: [
                { field: "contact", op: "like", value: q.trim() },
                ...(linkedUserIds && linkedUserIds.length > 0
                  ? [{ field: "employee", op: "in" as const, value: linkedUserIds }]
                  : []),
              ],
            }
          : undefined,
      );

      const employees = await fetchAll<EmployeeDoc>(
        "employee",
        { where: employeeWhere, depth: 2, sort: "-createdAt" },
        token,
        5,
      );

      const employeeIds = employees.map((employee) => employee.id);
      const transactions = employeeIds.length
        ? await fetchAll<TransactionDoc>(
            "transactions",
            {
              where: combineWhere(scope, { field: "Consultant", op: "in", value: employeeIds }),
              depth: 0,
            },
            token,
            10,
          )
        : [];

      const statsByEmployee = new Map<number, { count: number; total: number }>();
      for (const transaction of transactions) {
        const consultantId = Number(
          transaction.Consultant && typeof transaction.Consultant !== "number"
            ? transaction.Consultant.id
            : transaction.Consultant,
        );
        if (!consultantId) continue;
        const stats = statsByEmployee.get(consultantId) ?? { count: 0, total: 0 };
        stats.count += 1;
        stats.total += Number(transaction.transactionAmount ?? 0);
        statsByEmployee.set(consultantId, stats);
      }

      const teamRevenue = Array.from(statsByEmployee.values()).reduce(
        (sum, stats) => sum + stats.total,
        0,
      );

      return { employees, transactions, statsByEmployee, teamRevenue, role: user.role };
    },
    [q, gender],
  );

  if (loading && !data) return <PageSkeleton cards={3} rows={6} />;
  if (!data) return null;

  const { employees, transactions, statsByEmployee, teamRevenue, role } = data;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Your front-desk consultants — portal logins, details and desk performance."
        actions={role !== "consultant" ? <AddEmployeeDialog /> : undefined}
      />

      <div className="mb-4">
        <ListToolbar
          searchPlaceholder="Search employees by name, email or contact…"
          filters={[
            {
              key: "gender",
              label: "Gender",
              options: [
                { value: "all", label: "All employees" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ],
            },
          ]}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Team size</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(employees.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sales recorded
            </p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(transactions.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Desk revenue
            </p>
            <p className="mt-1 text-2xl font-semibold">{formatINR(teamRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No employees yet"
          description="Add your front-desk consultants so they can activate members and scan at the gate."
          action={role !== "consultant" ? <AddEmployeeDialog /> : undefined}
        />
      ) : (
        <div className="surface-glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Employee
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Contact
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Joined
                </TableHead>
                <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Sales
                </TableHead>
                <TableHead className="h-11 text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Collected
                </TableHead>
                <TableHead className="h-11 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const linkedUser =
                  employee.employee && typeof employee.employee !== "number"
                    ? (employee.employee as PayloadUser)
                    : null;
                const name =
                  employee.employeeName?.trim() ||
                  linkedUser?.fullName?.trim() ||
                  linkedUser?.email ||
                  `Employee #${employee.id}`;
                const stats = statsByEmployee.get(employee.id);

                return (
                  <TableRow
                    key={employee.id}
                    className="border-border/40 transition-colors hover:bg-accent"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted-foreground">
                          {initialsOf(name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {linkedUser?.email ?? "No portal login linked"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {employee.contact ?? linkedUser?.phone ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {formatDate(employee.joiningDate)}
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm tabular-nums">
                      {formatNumber(stats?.count ?? 0)}
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm tabular-nums">
                      {formatINR(stats?.total ?? 0)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {role !== "consultant" ? (
                        <EditEmployeeDialog
                          employeeId={employee.id}
                          initial={{
                            gender: employee.gender ?? "male",
                            joiningDate: employee.joiningDate?.slice(0, 10) ?? "",
                            contact: employee.contact ?? "",
                            address: employee.address ?? "",
                          }}
                        />
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
