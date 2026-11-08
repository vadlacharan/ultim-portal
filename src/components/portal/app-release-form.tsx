"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldAlert, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { portalCall } from "@/lib/portal-client";
import type { AppReleaseInput } from "@/lib/portal/actions/app-releases";

export function AppReleaseForm({
  mode,
  releaseId,
  initial,
}: {
  mode: "create" | "edit";
  releaseId?: number;
  initial: AppReleaseInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<AppReleaseInput>(initial);
  const [saving, startSaving] = useTransition();

  const update = <K extends keyof AppReleaseInput>(key: K, value: AppReleaseInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const notes = useMemo(
    () =>
      form.releaseNotes
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean)
        .slice(0, 4),
    [form.releaseNotes],
  );

  const submit = () => {
    startSaving(async () => {
      const result =
        mode === "create"
          ? await portalCall.createAppRelease(form)
          : await portalCall.updateAppRelease(releaseId as number, form);

      if (!result.ok) {
        toast.error(result.error ?? "Could not save the release.");
        return;
      }

      toast.success(mode === "create" ? "Release published" : "Release saved");
      router.push("/app/app-releases");
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Release</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={form.platform}
                disabled={mode === "edit"}
                onValueChange={(value) => update("platform", value as AppReleaseInput["platform"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                </SelectContent>
              </Select>
              {mode === "edit" && (
                <p className="text-[11px] text-muted-foreground">
                  Platform is fixed after publishing so existing installs keep the same identity.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Update mode</Label>
              <Select
                value={form.updateMode}
                onValueChange={(value) => update("updateMode", value as AppReleaseInput["updateMode"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">Optional — can skip</SelectItem>
                  <SelectItem value="force">Forced — must update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-version">Version name</Label>
              <Input
                id="release-version"
                value={form.version}
                onChange={(event) => update("version", event.target.value)}
                placeholder="1.2.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-build">Build number</Label>
              <Input
                id="release-build"
                inputMode="numeric"
                value={form.buildNumber ?? ""}
                onChange={(event) =>
                  update("buildNumber", event.target.value === "" ? null : Number(event.target.value))
                }
                placeholder="12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-min-version">Minimum supported version</Label>
              <Input
                id="release-min-version"
                value={form.minimumVersion}
                onChange={(event) => update("minimumVersion", event.target.value)}
                placeholder="1.0.0"
              />
              <p className="text-[11px] text-muted-foreground">
                Installs older than this are always forced. Leave blank to keep the update optional.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-min-build">Minimum supported build</Label>
              <Input
                id="release-min-build"
                inputMode="numeric"
                value={form.minimumBuildNumber ?? ""}
                onChange={(event) =>
                  update(
                    "minimumBuildNumber",
                    event.target.value === "" ? null : Number(event.target.value),
                  )
                }
                placeholder="10"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="release-store-url">Update URL</Label>
              <Input
                id="release-store-url"
                value={form.storeUrl}
                onChange={(event) => update("storeUrl", event.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=com.ultim.app"
              />
              <p className="text-[11px] text-muted-foreground">
                Play Store / App Store listing, or a direct APK download URL for internal builds.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">What members see</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <Label htmlFor="release-title">Dialog title</Label>
              <Input
                id="release-title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Update available"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-message">Message</Label>
              <Textarea
                id="release-message"
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                placeholder="A newer ULTIM build is ready with faster booking and gate check-in fixes."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="release-notes">Release notes</Label>
              <Textarea
                id="release-notes"
                value={form.releaseNotes}
                onChange={(event) => update("releaseNotes", event.target.value)}
                placeholder={"Faster slot loading\nCourt availability now refreshes instantly\nFixed QR check-out timer"}
                rows={5}
              />
              <p className="text-[11px] text-muted-foreground">
                One change per line. The app renders the first few as bullets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Publishing</CardTitle>
            <Badge variant={form.active ? "default" : "secondary"} className="text-[10px]">
              {form.active ? "Published" : "Draft"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-accent/40 p-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-[11px] text-muted-foreground">
                  The newest published release is served to the app.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <span>
                Minimum supported version and build always force an update, even when the mode is
                optional. Use force mode for breaking changes only.
              </span>
            </div>

            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {mode === "create" ? "Publish release" : "Save release"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="size-4 text-muted-foreground" />
              In-app preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-border bg-[#0c0c0d] p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  ULTIM
                </span>
                <Badge
                  variant={form.updateMode === "force" ? "destructive" : "secondary"}
                  className="text-[8px] uppercase tracking-wider"
                >
                  {form.updateMode === "force" ? "Required" : "Optional"}
                </Badge>
              </div>

              <h3 className="mt-4 text-base font-semibold leading-snug text-white">
                {form.title || "Update available"}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {form.message ||
                  "A newer ULTIM build is ready with fixes and improvements for booking."}
              </p>

              <div className="mt-3 flex items-center gap-2 text-[9px]">
                <span className="rounded-md border border-border bg-accent px-2 py-1 text-muted-foreground">
                  CURRENT 1.0.0
                </span>
                <span className="text-[#FF5A1F]">→</span>
                <span className="rounded-md border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 px-2 py-1 font-medium text-white">
                  NEW {form.version || "1.2.0"}
                  {form.buildNumber ? ` (${form.buildNumber})` : ""}
                </span>
              </div>

              {notes.length > 0 && (
                <ul className="mt-3 space-y-1.5 rounded-lg border border-border bg-white/[0.03] p-2.5">
                  {notes.map((note, index) => (
                    <li key={`${note}-${index}`} className="flex gap-2 text-[10px] text-zinc-300">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-[#FF5A1F]" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 rounded-full bg-[#FF5A1F] py-2 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-[#0A0503]">
                Update now
              </div>
              <p className="mt-2 text-center text-[9px] text-zinc-500">
                {form.updateMode === "force" ? "No dismiss option" : "Not now · dismissible"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
