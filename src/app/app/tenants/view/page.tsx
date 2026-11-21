"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { FacilityForm } from "@/components/portal/facility-form";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { AddPartnerDialog } from "@/components/portal/tenant-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import {
  API_URL,
  payload,
  type Media,
  type PayloadUser,
  type Tenant,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  FacilityActivityInput,
  FacilityInput,
} from "@/lib/portal/actions/facility";

const mediaUrl = (media?: Media | number | null): string | null => {
  if (!media || typeof media === "number") return null;
  const url = media.url;
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

export default function AdminTenantDetailPage() {
  const { isAdmin } = useRequireAdmin();
  const searchParams = useSearchParams();
  const tenantId = Number(searchParams.get("id"));

  const { data, loading } = usePortalQuery(
    async ({ token }) => {
      if (!Number.isFinite(tenantId)) return null;
      const tenant = await payload.get<Tenant>("tenants", tenantId, { depth: 1 }, token);
      const staff = await payload.list<PayloadUser>(
        "users",
        {
          where: {
            and: [
              { field: "tenant", op: "equals", value: tenantId },
              { field: "role", op: "in", value: ["partner", "consultant"] },
            ],
          },
          limit: 50,
          depth: 0,
          sort: "-createdAt",
        },
        token,
      );
      return { tenant, staff };
    },
    [tenantId],
  );

  if (!isAdmin) return null;
  if (loading && !data) return <PageSkeleton cards={2} rows={6} />;
  if (!data) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Facility not found"
        description="It may have been removed. Go back to the facility list."
        action={
          <Button asChild size="sm">
            <Link href="/app/tenants">All facilities</Link>
          </Button>
        }
      />
    );
  }

  const { tenant, staff } = data;

  const activities: FacilityActivityInput[] = (tenant.activities ?? []).map((activity) => ({
    activity: activity.activity,
    category: (activity.category ?? "") as FacilityActivityInput["category"],
    creditsPer60Minutes: Number(activity.creditsPer60Minutes ?? 1),
    active: activity.active !== false,
    capacityPerCourt: Number(activity.capacityPerCourt ?? 1),
    courts: (activity.courts ?? []).map((court) => court.name).filter(Boolean),
    courtSchedules: (activity.courtSchedules ?? []).map((schedule) => ({
      startTime: schedule.startTime ?? "",
      endTime: schedule.endTime ?? "",
      courts: (schedule.courts ?? []).filter((name): name is string => Boolean(name)),
    })),
  }));

  const photos = (tenant.facilityImages ?? [])
    .map((entry) => entry.facilityImage)
    .map((media) => {
      if (!media || typeof media === "number") return null;
      const url = mediaUrl(media);
      return url ? { id: media.id, url } : null;
    })
    .filter((photo): photo is { id: number; url: string } => photo !== null);

  const initial: FacilityInput = {
    Facility: tenant.Facility ?? "",
    description: tenant.description ?? "",
    city: tenant.city ?? "",
    latitude: tenant.location?.[1] ?? null,
    longitude: tenant.location?.[0] ?? null,
    activities,
    imageIds: photos.map((photo) => photo.id),
  };

  return (
    <>
      <PageHeader
        title={tenant.Facility ?? `Facility #${tenant.id}`}
        description={`${tenant.city ?? "No city"} · tenant #${tenant.id}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/tenants">
              <ArrowLeft className="size-4" />
              All facilities
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 border-border bg-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Staff accounts</CardTitle>
          <AddPartnerDialog tenantId={tenantId} />
        </CardHeader>
        <CardContent className="space-y-1">
          {staff.docs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No logins attached yet — add a partner so this facility can be managed.
            </p>
          ) : (
            staff.docs.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
              >
                <ShieldCheck className="size-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {user.fullName?.trim() || user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {user.role}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <FacilityForm tenantId={tenantId} initial={initial} photos={photos} />
    </>
  );
}
