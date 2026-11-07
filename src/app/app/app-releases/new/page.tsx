"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppReleaseForm } from "@/components/portal/app-release-form";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import type { AppReleaseInput } from "@/lib/portal/actions/app-releases";

const DEFAULTS: AppReleaseInput = {
  platform: "android",
  version: "",
  buildNumber: null,
  minimumVersion: "",
  minimumBuildNumber: null,
  updateMode: "optional",
  storeUrl: "https://play.google.com/store/apps/details?id=com.ultim.app",
  title: "Update available",
  message: "A newer ULTIM build is ready with fixes and improvements.",
  releaseNotes: "",
  active: true,
};

export default function NewAppReleasePage() {
  const { isAdmin } = useRequireAdmin();
  if (!isAdmin) return null;

  return (
    <>
      <PageHeader
        title="Publish app release"
        description="Tell the app which build is current, who must update and what changed."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/app-releases">
              <ArrowLeft className="size-4" />
              All releases
            </Link>
          </Button>
        }
      />
      <AppReleaseForm mode="create" initial={DEFAULTS} />
    </>
  );
}
