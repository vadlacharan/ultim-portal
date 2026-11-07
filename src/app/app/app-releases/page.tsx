"use client";

import Link from "next/link";
import { Info, Pencil, Plus, Smartphone } from "lucide-react";
import { EmptyState } from "@/components/portal/empty-state";
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
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { payload, type AppReleaseDoc } from "@/lib/api";
import { formatDate } from "@/lib/format";

const platformLabel = (platform: AppReleaseDoc["platform"]) =>
  platform === "ios" ? "iOS" : "Android";

export default function AppReleasesPage() {
  const { isAdmin } = useRequireAdmin();
  const { data: releases, loading } = usePortalQuery(
    ({ token }) =>
      payload.list<AppReleaseDoc>(
        "app-releases",
        { limit: 50, sort: "-releasedAt", depth: 0 },
        token,
      ),
    [],
  );

  if (!isAdmin) return null;
  if (loading && !releases) return <PageSkeleton cards={3} rows={6} />;

  const docs = releases?.docs ?? [];

  return (
    <>
      <PageHeader
        title="App releases"
        description="Control which ULTIM mobile version members must run. The app checks this before it starts and whenever it returns to the foreground."
        actions={
          <Button asChild size="sm">
            <Link href="/app/app-releases/new">
              <Plus className="size-4" />
              New release
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          The newest <strong className="text-foreground">published</strong> release per platform is
          served to the app. Installs below the minimum supported version or build are forced to
          update; otherwise the member sees a dismissible update sheet.
        </span>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No releases published yet"
          description="Publish the current Play Store / App Store build first. Until then the app boots normally without an update prompt."
          action={
            <Button asChild size="sm">
              <Link href="/app/app-releases/new">
                <Plus className="size-4" />
                Publish a release
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="surface-glass overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Platform
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Release
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Minimum supported
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Mode
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-11 text-xs uppercase tracking-wider text-muted-foreground">
                  Released
                </TableHead>
                <TableHead className="h-11 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((release) => (
                <TableRow
                  key={release.id}
                  className="border-border/40 transition-colors hover:bg-white/[0.03]"
                >
                  <TableCell className="py-3">
                    <Badge variant="outline" className="font-medium">
                      {platformLabel(release.platform)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="font-medium">{release.version}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {release.buildNumber != null ? `Build ${release.buildNumber}` : "No build number"}
                    </p>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {release.minimumVersion || release.minimumBuildNumber != null ? (
                      <span>
                        {release.minimumVersion ?? "—"}
                        {release.minimumBuildNumber != null
                          ? ` (build ${release.minimumBuildNumber})`
                          : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {release.updateMode === "force" ? (
                      <Badge variant="destructive">Forced</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {release.active ? (
                      <Badge className="border-transparent bg-[var(--success)]/12 text-[var(--success)]">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {formatDate(release.releasedAt)}
                  </TableCell>
                  <TableCell className="py-3">
                    <Button asChild variant="ghost" size="icon" aria-label="Edit release">
                      <Link href={`/app/app-releases/edit?id=${release.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
