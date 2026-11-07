"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppReleaseForm } from "@/components/portal/app-release-form";
import { EmptyState } from "@/components/portal/empty-state";
import { PageHeader } from "@/components/portal/page-header";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";
import { Button } from "@/components/ui/button";
import { usePortalQuery } from "@/hooks/use-portal-query";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { payload, type AppReleaseDoc } from "@/lib/api";
import type { AppReleaseInput } from "@/lib/portal/actions/app-releases";

export default function EditAppReleasePage() {
  const { isAdmin } = useRequireAdmin();
  const searchParams = useSearchParams();
  const releaseId = Number(searchParams.get("id"));

  const { data: release, loading } = usePortalQuery(
    ({ token }) =>
      Number.isFinite(releaseId)
        ? payload.get<AppReleaseDoc>("app-releases", releaseId, { depth: 0 }, token)
        : Promise.resolve(null),
    [releaseId],
  );

  if (!isAdmin) return null;
  if (loading && !release) return <PageSkeleton cards={2} rows={6} />;
  if (!release) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Release not found"
        description="It may have been removed. Go back to the release list."
        action={
          <Button asChild size="sm">
            <Link href="/app/app-releases">All releases</Link>
          </Button>
        }
      />
    );
  }

  const initial: AppReleaseInput = {
    platform: release.platform,
    version: release.version ?? "",
    buildNumber: release.buildNumber != null ? Number(release.buildNumber) : null,
    minimumVersion: release.minimumVersion ?? "",
    minimumBuildNumber:
      release.minimumBuildNumber != null ? Number(release.minimumBuildNumber) : null,
    updateMode: release.updateMode === "force" ? "force" : "optional",
    storeUrl: release.storeUrl ?? "",
    title: release.title ?? "Update available",
    message: release.message ?? "",
    releaseNotes: release.releaseNotes ?? "",
    active: release.active !== false,
  };

  return (
    <>
      <PageHeader
        title={`${release.platform === "ios" ? "iOS" : "Android"} ${release.version}`}
        description="Changes apply the next time a member starts the app or returns to the foreground."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/app-releases">
              <ArrowLeft className="size-4" />
              All releases
            </Link>
          </Button>
        }
      />
      <AppReleaseForm mode="edit" releaseId={releaseId} initial={initial} />
    </>
  );
}
