"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CourtScheduleInput,
  FacilityActivityInput,
} from "@/lib/portal/actions/facility";

const COURT_ACTIVITIES = ["badminton", "pickleball", "cricket"];

/** Facility day, hourly. One row per bookable hour. */
const DAY_START = 6;
const DAY_END = 23;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, index) => DAY_START + index);

const hourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00`;

const hourKey = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const supportsCourts = (activity: string) => COURT_ACTIVITIES.includes(activity);

/**
 * Turn per-hour enabled court lists into schedule windows, merging consecutive
 * hours that have the same set (09:00 + 10:00 with the same courts becomes a
 * single 09:00-11:00 window).
 */
const buildSchedules = (courts: string[], enabledByHour: Map<number, string[]>): CourtScheduleInput[] => {
  const schedules: CourtScheduleInput[] = [];
  let current: { start: number; end: number; courts: string[] } | null = null;

  for (const hour of HOURS) {
    const enabled = enabledByHour.get(hour) ?? [];
    const isFull = courts.length > 0 && enabled.length >= courts.length;

    if (isFull) {
      // No restriction for this hour: close any open window.
      if (current) {
        schedules.push({
          startTime: hourKey(current.start),
          endTime: hourKey(current.end),
          courts: current.courts,
        });
        current = null;
      }
      continue;
    }

    const sorted = [...enabled].sort((a, b) => courts.indexOf(a) - courts.indexOf(b));
    const sameAsCurrent =
      current &&
      current.courts.length === sorted.length &&
      current.courts.every((court, index) => court === sorted[index]);

    if (sameAsCurrent && current) {
      current.end = hour + 1;
    } else {
      if (current) {
        schedules.push({
          startTime: hourKey(current.start),
          endTime: hourKey(current.end),
          courts: current.courts,
        });
      }
      current = { start: hour, end: hour + 1, courts: sorted };
    }
  }

  if (current) {
    schedules.push({
      startTime: hourKey(current.start),
      endTime: hourKey(current.end),
      courts: current.courts,
    });
  }

  return schedules;
};

/** Per-hour enabled courts derived from the saved windows (default: all). */
const readMatrix = (courts: string[], schedules: CourtScheduleInput[]): Map<number, string[]> => {
  const map = new Map<number, string[]>();

  for (const hour of HOURS) {
    const minutes = hour * 60;
    const window = schedules.find((schedule) => {
      const [sh, sm] = String(schedule.startTime).split(":").map(Number);
      const [eh, em] = String(schedule.endTime).split(":").map(Number);
      if (![sh, sm, eh, em].every(Number.isFinite)) return false;
      return minutes >= sh * 60 + sm && minutes < eh * 60 + em;
    });

    const enabled = window
      ? courts.filter((court) => window.courts.includes(court))
      : [...courts];

    map.set(hour, enabled);
  }

  return map;
};

export function CourtsEditor({
  activity,
  onChange,
  onSave,
  saving,
  dirty,
}: {
  activity: FacilityActivityInput;
  onChange: (patch: Partial<FacilityActivityInput>) => void;
  /** Saves the whole facility form (same action as the page Save button). */
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  const [pendingCourt, setPendingCourt] = useState("");

  const courts = activity.courts;
  const schedules = activity.courtSchedules ?? [];

  const matrix = useMemo(() => readMatrix(courts, schedules), [courts, schedules]);

  const restrictedHours = useMemo(
    () =>
      HOURS.filter((hour) => {
        const enabled = matrix.get(hour) ?? [];
        return courts.length > 0 && enabled.length < courts.length;
      }).length,
    [courts.length, matrix],
  );

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
    onChange({
      courts: next,
      courtSchedules: schedules.map((schedule) => ({
        ...schedule,
        courts: schedule.courts.map((court) => (court === previous ? name : court)),
      })),
    });
  };

  const removeCourt = (index: number) => {
    const removed = courts[index];
    onChange({
      courts: courts.filter((_, i) => i !== index),
      courtSchedules: schedules
        .map((schedule) => ({ ...schedule, courts: schedule.courts.filter((court) => court !== removed) }))
        .filter((schedule) => schedule.courts.length > 0),
    });
  };

  const moveCourt = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= courts.length) return;
    const next = [...courts];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ courts: next });
  };

  const toggleCell = (hour: number, court: string) => {
    const next = new Map(matrix);
    const enabled = next.get(hour) ?? [];
    next.set(
      hour,
      enabled.includes(court) ? enabled.filter((name) => name !== court) : [...enabled, court],
    );
    onChange({ courtSchedules: buildSchedules(courts, next) });
  };

  const setRow = (hour: number, enabled: boolean) => {
    const next = new Map(matrix);
    next.set(hour, enabled ? [...courts] : []);
    onChange({ courtSchedules: buildSchedules(courts, next) });
  };

  const resetAll = () => onChange({ courtSchedules: [] });

  return (
    <div className="space-y-5">
      {/* ── Courts ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Courts / lanes</Label>
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

      {/* ── Time × courts matrix ── */}
      <div className="rounded-xl border border-border/70 bg-background/40 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="size-3.5" />
              When can each court be booked?
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tap a cell to close or open that court for the hour. Closed courts cannot be booked —
              the member app shows them as full.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                restrictedHours > 0
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {restrictedHours > 0 ? `${restrictedHours} hour${restrictedHours > 1 ? "s" : ""} restricted` : "All hours open"}
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={resetAll} disabled={schedules.length === 0}>
              <RotateCcw className="size-3.5" />
              Open all
            </Button>
          </div>
        </div>

        {courts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add at least one court to configure availability.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background/95 px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                  {courts.map((court) => (
                    <th
                      key={court}
                      className="px-1.5 py-2 text-center text-[11px] font-medium text-muted-foreground"
                    >
                      {court}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Row
                  </th>
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => {
                  const enabled = matrix.get(hour) ?? [];
                  const allOn = enabled.length >= courts.length;
                  const allOff = enabled.length === 0;

                  return (
                    <tr key={hour} className="group">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-background/95 px-2 py-1 text-xs tabular-nums text-muted-foreground">
                        {hourLabel(hour)}
                      </td>
                      {courts.map((court) => {
                        const on = enabled.includes(court);
                        return (
                          <td key={court} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => toggleCell(hour, court)}
                              aria-pressed={on}
                              aria-label={`${court} at ${hourLabel(hour)}: ${on ? "bookable" : "closed"}`}
                              className={`mx-auto flex size-9 items-center justify-center rounded-lg border transition ${
                                on
                                  ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                                  : "border-border bg-background text-muted-foreground/40 hover:border-destructive/40 hover:text-destructive"
                              }`}
                            >
                              {on ? <Check className="size-4" /> : <span className="text-sm">–</span>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() => setRow(hour, !allOn)}
                          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                        >
                          {allOn ? "Close all" : allOff ? "Open all" : "Open all"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <p className="text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded border border-primary/50 bg-primary/15" /> bookable
            </span>
            <span className="ml-3 inline-flex items-center gap-1">
              <span className="inline-block size-3 rounded border border-border bg-background" /> closed
            </span>
            <span className="ml-3">Hours you don&apos;t change keep every court open.</span>
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saving || !dirty}
            className="min-w-[140px]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { supportsCourts };
