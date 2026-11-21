"use client";

import { useMemo, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type {
  CourtScheduleInput,
  FacilityActivityInput,
} from "@/lib/portal/actions/facility";

const COURT_ACTIVITIES = ["badminton", "pickleball", "cricket"];

/** Every hour from 05:00 to 23:00 - the slots facilities actually run. */
const TIME_OPTIONS = Array.from({ length: 19 }, (_, index) => {
  const hour = index + 5;
  return `${String(hour).padStart(2, "0")}:00`;
});

const isCourtActivity = (activity: string) => COURT_ACTIVITIES.includes(activity);

/**
 * Courts editor: one row per court instead of a comma separated string, plus
 * optional per-time-slot availability windows.
 */
export function CourtsEditor({
  activity,
  onChange,
}: {
  activity: FacilityActivityInput;
  onChange: (patch: Partial<FacilityActivityInput>) => void;
}) {
  const [pendingCourt, setPendingCourt] = useState("");

  const courts = activity.courts;

  const addCourt = () => {
    const name = pendingCourt.trim();
    if (!name) return;
    if (courts.some((court) => court.toLowerCase() === name.toLowerCase())) {
      setPendingCourt("");
      return;
    }
    onChange({ courts: [...courts, name] });
    setPendingCourt("");
  };

  const renameCourt = (index: number, name: string) => {
    const previous = courts[index];
    const next = courts.map((court, i) => (i === index ? name : court));
    // Keep schedule references in sync with the rename.
    const schedules = (activity.courtSchedules ?? []).map((schedule) => ({
      ...schedule,
      courts: schedule.courts.map((court) => (court === previous ? name : court)),
    }));
    onChange({ courts: next, courtSchedules: schedules });
  };

  const removeCourt = (index: number) => {
    const removed = courts[index];
    const next = courts.filter((_, i) => i !== index);
    const schedules = (activity.courtSchedules ?? [])
      .map((schedule) => ({
        ...schedule,
        courts: schedule.courts.filter((court) => court !== removed),
      }))
      .filter((schedule) => schedule.courts.length > 0 || courts.length - 1 === 0);
    onChange({ courts: next, courtSchedules: schedules });
  };

  const moveCourt = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= courts.length) return;
    const next = [...courts];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ courts: next });
  };

  const schedules = activity.courtSchedules ?? [];

  const updateSchedule = (index: number, patch: Partial<CourtScheduleInput>) => {
    onChange({
      courtSchedules: schedules.map((schedule, i) => (i === index ? { ...schedule, ...patch } : schedule)),
    });
  };

  const addSchedule = () => {
    const start = "09:00";
    const end = "10:00";
    onChange({
      courtSchedules: [...schedules, { startTime: start, endTime: end, courts: [...courts] }],
    });
  };

  const removeSchedule = (index: number) => {
    onChange({ courtSchedules: schedules.filter((_, i) => i !== index) });
  };

  const toggleCourtInSchedule = (index: number, court: string) => {
    const schedule = schedules[index];
    const has = schedule.courts.includes(court);
    updateSchedule(index, {
      courts: has ? schedule.courts.filter((name) => name !== court) : [...schedule.courts, court],
    });
  };

  const selectAllCourts = (index: number) => updateSchedule(index, { courts: [...courts] });
  const selectNoCourts = (index: number) => updateSchedule(index, { courts: [] });

  const allSelected = useMemo(
    () => (schedule: CourtScheduleInput) =>
      courts.length > 0 && schedule.courts.length >= courts.length,
    [courts.length],
  );

  return (
    <div className="space-y-5">
      {/* ── Courts ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Courts / lanes
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {courts.length === 0 ? "No courts yet" : `${courts.length} court${courts.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {courts.length > 0 ? (
          <ul className="space-y-2">
            {courts.map((court, index) => (
              <li key={`${court}-${index}`} className="flex items-center gap-2">
                <span className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  value={court}
                  onChange={(event) => renameCourt(index, event.target.value)}
                  placeholder={`Court ${index + 1}`}
                  className="h-9"
                />
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => moveCourt(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${court} up`}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => moveCourt(index, 1)}
                    disabled={index === courts.length - 1}
                    aria-label={`Move ${court} down`}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCourt(index)}
                    aria-label={`Remove ${court}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border/70 py-4 text-center text-xs text-muted-foreground">
            Add the courts members can book (e.g. Court 1, Court 2).
          </p>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={pendingCourt}
            onChange={(event) => setPendingCourt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCourt();
              }
            }}
            placeholder="Court name, then Enter"
            className="h-9"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCourt} disabled={!pendingCourt.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {/* ── Availability windows ── */}
      <div className="rounded-xl border border-border/70 bg-background/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="size-3.5" />
              Court availability by time
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Restrict which courts are bookable in a window. Times you don&apos;t list keep every
              court open.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addSchedule} disabled={courts.length === 0}>
            <Plus className="size-4" />
            Add window
          </Button>
        </div>

        {schedules.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            All courts are bookable all day. Add a window to limit a specific time range.
          </p>
        ) : (
          <ul className="space-y-3">
            {schedules.map((schedule, index) => (
              <li key={index} className="rounded-lg border border-border/70 bg-card p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-28 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">From</Label>
                    <Select
                      value={schedule.startTime}
                      onValueChange={(value) => updateSchedule(index, { startTime: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">To</Label>
                    <Select
                      value={schedule.endTime}
                      onValueChange={(value) => updateSchedule(index, { endTime: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-[11px]"
                      onClick={() => selectAllCourts(index)}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-[11px]"
                      onClick={() => selectNoCourts(index)}
                    >
                      None
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSchedule(index)}
                      aria-label="Remove window"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {courts.map((court) => {
                    const enabled = schedule.courts.includes(court);
                    return (
                      <button
                        key={court}
                        type="button"
                        onClick={() => toggleCourtInSchedule(index, court)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          enabled
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-border/80"
                        }`}
                        aria-pressed={enabled}
                      >
                        {court}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {allSelected(schedule)
                    ? "All courts available in this window (no restriction)."
                    : schedule.courts.length === 0
                      ? "No courts available in this window — bookings are blocked."
                      : `${schedule.courts.join(", ")} bookable in this window.`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Courts editor is only meaningful for court-based activities. */
export const supportsCourts = (activity: string) => isCourtActivity(activity);

/** Toggle used by the form to enable/disable court configuration. */
export function CourtActivitySwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return <Switch checked={enabled} onCheckedChange={onChange} />;
}
