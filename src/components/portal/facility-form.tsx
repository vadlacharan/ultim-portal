"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import type {
  FacilityActivityInput,
  FacilityInput,
} from "@/lib/portal/actions/facility";

const ACTIVITY_OPTIONS = ["gym", "badminton", "pickleball", "cricket", "swimming"];
const CATEGORY_OPTIONS = ["fitness", "sports", "health"];

type Photo = { id: number; url: string };

export function FacilityForm({
  tenantId,
  initial,
  photos,
}: {
  tenantId: number;
  initial: FacilityInput;
  photos: Photo[];
}) {
  const [form, setForm] = useState<FacilityInput>(initial);
  const [photoList, setPhotoList] = useState<Photo[]>(photos);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof FacilityInput>(key: K, value: FacilityInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateActivity = (index: number, patch: Partial<FacilityActivityInput>) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.map((activity, i) =>
        i === index ? { ...activity, ...patch } : activity,
      ),
    }));
    setDirty(true);
  };

  const addActivity = () => {
    const used = new Set(form.activities.map((activity) => activity.activity));
    const next = ACTIVITY_OPTIONS.find((option) => !used.has(option));
    if (!next) {
      toast.info("All supported activities are already added.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          activity: next,
          category: next === "gym" || next === "swimming" ? "fitness" : "sports",
          creditsPer60Minutes: 1,
          active: true,
          capacityPerCourt: next === "badminton" ? 6 : 1,
          courts: [],
        },
      ],
    }));
    setDirty(true);
  };

  const removeActivity = (index: number) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== index),
    }));
    setDirty(true);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await portalCall.uploadFacilityImage(file);
        if (!result.ok || !result.media) {
          toast.error(result.error ?? "Upload failed");
          continue;
        }
        setPhotoList((prev) => [
          ...prev,
          { id: result.media!.id, url: result.media!.url ?? "" },
        ]);
        setDirty(true);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = () => {
    startSaving(async () => {
      const result = await portalCall.updateFacility(tenantId, {
        ...form,
        imageIds: photoList.map((photo) => photo.id),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the facility.");
        return;
      }
      toast.success("Facility updated");
      setDirty(false);
    });
  };

  const locationSummary = useMemo(() => {
    if (form.latitude == null || form.longitude == null) return "No location set";
    return `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`;
  }, [form.latitude, form.longitude]);

  return (
    <div className="space-y-6 pb-24">
      {/* Profile */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="facility-name">Facility name</Label>
            <Input
              id="facility-name"
              value={form.Facility}
              onChange={(event) => update("Facility", event.target.value)}
              placeholder="e.g. Iron Yard Fitness Studio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-city">City</Label>
            <Input
              id="facility-city"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              placeholder="Hyderabad"
            />
          </div>
          <div className="space-y-2">
            <Label>Facility ID</Label>
            <Input value={`#${tenantId}`} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="facility-description">Description</Label>
            <Textarea
              id="facility-description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What makes your facility special? Shown in the ULTIM app."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Location</CardTitle>
          <span className="text-xs text-muted-foreground">{locationSummary}</span>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facility-lat">Latitude</Label>
            <Input
              id="facility-lat"
              type="number"
              inputMode="decimal"
              step="0.00001"
              value={form.latitude ?? ""}
              onChange={(event) =>
                update("latitude", event.target.value === "" ? null : Number(event.target.value))
              }
              placeholder="17.38504"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-lng">Longitude</Label>
            <Input
              id="facility-lng"
              type="number"
              inputMode="decimal"
              step="0.00001"
              value={form.longitude ?? ""}
              onChange={(event) =>
                update("longitude", event.target.value === "" ? null : Number(event.target.value))
              }
              placeholder="78.48667"
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Members see this pin in the app for directions. Longitude first in the backend — we
            take care of the order here.
          </p>
        </CardContent>
      </Card>

      {/* Activities & courts */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Activities & courts</CardTitle>
          <Button variant="outline" size="sm" onClick={addActivity}>
            <Plus className="size-4" />
            Add activity
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.activities.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
              No activities yet — add at least one so members can book.
            </p>
          )}

          {form.activities.map((activity, index) => (
            <div
              key={`${activity.activity}-${index}`}
              className="surface-glass space-y-4 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-40 space-y-2">
                  <Label>Activity</Label>
                  <Select
                    value={activity.activity}
                    onValueChange={(value) => updateActivity(index, { activity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={activity.category || "fitness"}
                    onValueChange={(value) =>
                      updateActivity(index, { category: value as FacilityActivityInput["category"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-36 space-y-2">
                  <Label>Credits / hour</Label>
                  <Input
                    type="number"
                    min={1}
                    value={activity.creditsPer60Minutes}
                    onChange={(event) =>
                      updateActivity(index, { creditsPer60Minutes: Number(event.target.value) })
                    }
                  />
                </div>

                <div className="w-32 space-y-2">
                  <Label>Per court cap</Label>
                  <Input
                    type="number"
                    min={1}
                    value={activity.capacityPerCourt}
                    onChange={(event) =>
                      updateActivity(index, { capacityPerCourt: Number(event.target.value) })
                    }
                  />
                </div>

                <div className="flex items-center gap-3 pb-1">
                  <Switch
                    checked={activity.active}
                    onCheckedChange={(checked) => updateActivity(index, { active: checked })}
                    id={`active-${index}`}
                  />
                  <Label htmlFor={`active-${index}`} className="text-sm text-muted-foreground">
                    {activity.active ? "Bookable" : "Hidden"}
                  </Label>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => removeActivity(index)}
                  aria-label={`Remove ${activity.activity}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Courts / lanes</Label>
                <Input
                  value={activity.courts.join(", ")}
                  placeholder="Court 1, Court 2, Court 3"
                  onChange={(event) =>
                    updateActivity(index, {
                      courts: event.target.value.split(",").map((name) => name.trim()),
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma separated, in display order. Members pick one when booking.
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Photos</CardTitle>
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </CardHeader>
        <CardContent>
          {photoList.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
              No photos yet — the first photo becomes the cover in the app.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photoList.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-white/5"
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt="Facility photo"
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoList((prev) => prev.filter((item) => item.id !== photo.id));
                      setDirty(true);
                    }}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl lg:pl-72">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <Button onClick={save} disabled={saving || uploading}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
