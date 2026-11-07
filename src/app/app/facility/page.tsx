"use client";

import { Building2, Info } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
import { FacilityForm } from "@/components/portal/facility-form";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { API_URL, payload, type Media, type Tenant } from "@/lib/api";
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

export default function FacilityPage() {
  const { data: tenant, loading, user } = usePortalQuery(
    ({ user, token }) =>
      user.tenantId
        ? payload.get<Tenant>("tenants", user.tenantId, { depth: 1 }, token)
        : Promise.resolve(null),
    [],
  );

  if (loading && !tenant) return <PageSkeleton cards={2} rows={6} />;

  if (user?.role === "admin") {
    return (
      <>
        <PageHeader
          title="Facility"
          description="Facility profiles are managed per tenant."
        />
        <EmptyState
          icon={Building2}
          title="Pick a tenant to manage"
          description="Open a facility from the Tenants page to edit its profile, courts and credit rates."
        />
      </>
    );
  }

  if (!user?.tenantId) {
    return (
      <>
        <PageHeader title="Facility" />
        <EmptyState
          icon={Info}
          title="No facility linked"
          description="Your account isn't linked to a facility yet. Ask a ULTIM admin to attach you to your center."
        />
      </>
    );
  }

  if (user.role === "consultant") {
    return (
      <>
        <PageHeader title="Facility" description={user.tenantName ?? undefined} />
        <EmptyState
          icon={Info}
          title="View-only for consultants"
          description="Facility profiles are edited by the facility partner. Ask your manager if something needs updating."
        />
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <PageHeader title="Facility" />
        <EmptyState
          icon={Info}
          title="Facility not found"
          description="The linked facility could not be loaded. Try refreshing the page."
        />
      </>
    );
  }

  const activities: FacilityActivityInput[] = (tenant.activities ?? []).map((activity) => ({
    activity: activity.activity,
    category: (activity.category ?? "") as FacilityActivityInput["category"],
    creditsPer60Minutes: Number(activity.creditsPer60Minutes ?? 1),
    active: activity.active !== false,
    capacityPerCourt: Number(activity.capacityPerCourt ?? 1),
    courts: (activity.courts ?? []).map((court) => court.name).filter(Boolean),
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
        title="Facility"
        description={`How ${tenant.Facility ?? "your facility"} appears to members in the ULTIM app.`}
      />
      <FacilityForm tenantId={tenant.id} initial={initial} photos={photos} />
    </>
  );
}
