"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Mail, Phone, Target } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { ListToolbar } from "@/components/portal/list-toolbar";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import {
  AssignConsultantSelect,
  ConvertLeadButton,
  EditLeadDialog,
  LeadStatusSelect,
  NewLeadDialog,
} from "@/components/portal/lead-controls";
import { LEAD_STATUSES } from "@/lib/leads";
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
import { payload, type EmployeeDoc, type EnquiryDoc, type MembershipPlan, type PayloadUser } from "@/lib/api";
import { formatDate, titleCase } from "@/lib/format";
import { tenantScope } from "@/lib/scope";
import { combineWhere } from "@/lib/where-utils";

const PAGE_SIZE = 12;

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const source = searchParams.get("source") ?? "all";
  const consultant = searchParams.get("consultant") ?? "all";

  const { data, loading } = usePortalQuery(
    async ({ user, token }) => {
      const scope = tenantScope(user);
      const where = combineWhere(
        scope,
        status !== "all" ? { field: "status", op: "equals", value: status } : undefined,
        source && source !== "all"
          ? { field: "source", op: "equals", value: source }
          : undefined,
        consultant && consultant !== "all"
          ? { field: "enquiryConsultant", op: "equals", value: Number(consultant) }
          : undefined,
        q.trim()
          ? {
              or: [
                { field: "fullName", op: "like", value: q.trim() },
                { field: "contact", op: "like", value: q.trim() },
                { field: "email", op: "like", value: q.trim() },
              ],
            }
          : undefined,
      );

      const [leads, employeeDocs, planDocs] = await Promise.all([
        payload.list<EnquiryDoc>(
          "enquiry",
          { where, page, limit: PAGE_SIZE, sort: "-createdAt", depth: 1 },
          token,
        ),
        payload.list<EmployeeDoc>(
          "employee",
          { where: combineWhere(scope), limit: 100, depth: 1 },
          token,
        ),
        payload.list<MembershipPlan>(
          "membership-plans",
          { where: combineWhere(scope), limit: 100, depth: 0 },
          token,
        ),
      ]);

      const employees = (employeeDocs.docs ?? []).map((employee) => {
        const userDoc =
          employee.employee && typeof employee.employee !== "number"
            ? (employee.employee as PayloadUser)
            : null;
        return {
          id: employee.id,
          name:
            employee.employeeName?.trim() ||
            userDoc?.fullName?.trim() ||
            userDoc?.email ||
            `Employee #${employee.id}`,
        };
      });

      const planNames = new Map(
        (planDocs.docs ?? []).map((plan) => [String(plan.id), plan.planName]),
      );

      return { leads, employees, planNames: planNames as unknown as Record<string, string>, role: user.role };
    },
    [page, q, status, source, consultant],
  );

  if (loading && !data) return <PageSkeleton cards={4} rows={8} />;
  if (!data) return null;

  const { leads, employees, planNames, role } = data;
  const totalPages = Math.max(1, leads.totalPages ?? 1);

  const employeeName = (value: EnquiryDoc["enquiryConsultant"]): string => {
    if (!value || typeof value === "number") return "Unassigned";
    const employee = value as EmployeeDoc;
    return employee.employeeName?.trim() || `Employee #${employee.id}`;
  };

  const buildHref = (targetPage: number) => {
    const search = new URLSearchParams(searchParams.toString());
    search.delete("page");
    if (targetPage > 1) search.set("page", String(targetPage));
    const qs = search.toString();
    return `/app/leads${qs ? `?${qs}` : ""}`;
  };

  const hasFilters = !!(q || status !== "all" || source !== "all" || consultant !== "all");

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every walk-in, call and referral — from first contact to a paying member."
        actions={<NewLeadDialog />}
      />

      <ListToolbar
        searchPlaceholder="Search leads by name, phone or email…"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "all", label: "All statuses" },
              ...LEAD_STATUSES.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ],
          },
          {
            key: "source",
            label: "Source",
            options: [
              { value: "all", label: "All sources" },
              { value: "walk-in", label: "Walk-in" },
              { value: "website", label: "Website" },
              { value: "referral", label: "Referral" },
              { value: "ad", label: "Ad" },
            ],
          },
          {
            key: "consultant",
            label: "Consultant",
            options: [
              { value: "all", label: "All consultants" },
              ...employees.map((employee) => ({
                value: String(employee.id),
                label: employee.name,
              })),
            ],
          },
        ]}
      />

      <div className="mt-4">
        {leads.docs.length === 0 ? (
          <EmptyState
            icon={Target}
            title={hasFilters ? "No leads match" : "No leads yet"}
            description={
              hasFilters
                ? "Try a different search or status filter."
                : "Add walk-ins as they arrive — converting a lead creates the member account in one step."
            }
          />
        ) : (
          <div className="surface-glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Lead
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Segment
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Interest
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Source
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Consultant
                  </TableHead>
                  <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                    Added
                  </TableHead>
                  <TableHead className="h-11 w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.docs.map((lead) => {
                  const converted = lead.status === "convertee";
                  const consultantId =
                    lead.enquiryConsultant && typeof lead.enquiryConsultant !== "number"
                      ? (lead.enquiryConsultant as EmployeeDoc).id
                      : null;
                  const segment = lead.segment ?? "adult";
                  const planName = lead.interestedPlan
                    ? planNames?.[String(lead.interestedPlan)]
                    : undefined;

                  return (
                    <TableRow
                      key={lead.id}
                      className="border-border/40 transition-colors hover:bg-accent"
                    >
                      <TableCell className="py-3">
                        <p className="font-medium">{lead.fullName ?? "Unnamed lead"}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {lead.contact ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3" />
                              {lead.contact}
                            </span>
                          ) : null}
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="size-3" />
                              {lead.email}
                            </span>
                          ) : null}
                        </div>
                        {lead.notes ? (
                          <p className="mt-1 line-clamp-1 max-w-[280px] text-xs text-muted-foreground/70">
                            {lead.notes}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant={segment === "kid" ? "default" : "secondary"}
                            className="text-[10px] capitalize"
                          >
                            {segment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {lead.age != null ? `${lead.age} yrs` : "Age —"}
                            {lead.gender
                              ? ` · ${lead.gender === "not-specified" ? "n/s" : lead.gender}`
                              : ""}
                          </span>
                          {segment === "kid" && (lead.parentName || lead.parentAge != null) ? (
                            <span className="text-xs text-muted-foreground">
                              Parent: {lead.parentName ?? "—"}
                              {lead.parentAge != null ? ` (${lead.parentAge})` : ""}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col items-start gap-1">
                          {planName ? (
                            <span className="text-sm">{planName}</span>
                          ) : lead.interestedActivity ? (
                            <span className="text-sm capitalize">{lead.interestedActivity}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {planName && lead.interestedActivity ? (
                            <span className="text-xs capitalize text-muted-foreground">
                              {lead.interestedActivity}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {titleCase(lead.source)}
                        </Badge>
                        {lead.walkInDate ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(lead.walkInDate)}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell className="py-3">
                        <LeadStatusSelect leadId={lead.id} status={lead.status ?? "new"} />
                      </TableCell>

                      <TableCell className="py-3">
                        {role === "consultant" ? (
                          <span className="text-xs text-muted-foreground">
                            {employeeName(lead.enquiryConsultant)}
                          </span>
                        ) : (
                          <AssignConsultantSelect
                            leadId={lead.id}
                            employeeId={consultantId}
                            employees={employees}
                          />
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditLeadDialog
                            lead={lead}
                            trigger={
                              <Button size="sm" variant="ghost" className="text-xs">
                                Edit
                              </Button>
                            }
                          />
                          {converted ? (
                            <Badge className="border-transparent bg-[var(--success)]/12 text-[var(--success)]">
                              Converted
                            </Badge>
                          ) : (
                            <ConvertLeadButton leadId={lead.id} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {leads.docs.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.totalDocs)} of{" "}
            {leads.totalDocs}
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
