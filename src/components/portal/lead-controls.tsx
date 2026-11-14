"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES } from "@/lib/leads";
import { portalCall } from "@/lib/portal-client";
import {
  LeadDetailsFields,
  emptyLeadDetails,
  leadDetailsToState,
  type LeadDetailsState,
} from "@/components/portal/lead-details-fields";
import type { EnquiryDoc } from "@/lib/api";

const detailsToInput = (details: LeadDetailsState) => ({
  age: details.age === "" ? null : Number(details.age),
  gender: (details.gender || null) as "male" | "female" | "other" | "not-specified" | null,
  segment: details.segment as "adult" | "parent" | "kid",
  parentName: details.parentName,
  parentAge: details.parentAge === "" ? null : Number(details.parentAge),
  interestedActivity: details.interestedActivity || null,
  interestedPlan: details.interestedPlan ? Number(details.interestedPlan) : null,
  walkInDate: details.walkInDate || null,
});

// ─── New lead ─────────────────────────────────────────────────────────────────

export function NewLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState({
    fullName: "",
    contact: "",
    email: "",
    source: "walk-in" as "walk-in" | "website" | "referral" | "ad",
    notes: "",
  });
  const [details, setDetails] = useState<LeadDetailsState>(emptyLeadDetails);

  const isWalkIn = form.source === "walk-in";
  const missingWalkInDate = isWalkIn && !details.walkInDate;
  const missingParent = details.segment === "kid" && (!details.parentName.trim() || !details.parentAge);

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.createLead({
        ...form,
        ...detailsToInput(details),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the lead.");
        return;
      }
      toast.success("Lead added");
      setForm({ fullName: "", contact: "", email: "", source: "walk-in", notes: "" });
      setDetails(emptyLeadDetails);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Walk-ins, calls and referrals — track them until they become members.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Name</Label>
              <Input
                id="lead-name"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Rahul Sharma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Mobile</Label>
              <Input
                id="lead-phone"
                value={form.contact}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contact: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                }
                placeholder="9876543210"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Email (optional)</Label>
            <Input
              id="lead-email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="rahul@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, source: value as typeof prev.source }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="ad">Ad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Interested in badminton 3-month plan…"
            />
          </div>

          <LeadDetailsFields
            value={details}
            onChange={setDetails}
            showWalkInDate={isWalkIn}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !form.fullName || !form.contact || missingWalkInDate || missingParent}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit lead ────────────────────────────────────────────────────────────────

export function EditLeadDialog({ lead, trigger }: { lead: EnquiryDoc; trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState({
    fullName: lead.fullName ?? "",
    contact: lead.contact ?? "",
    email: lead.email ?? "",
    source: (lead.source ?? "walk-in") as "walk-in" | "website" | "referral" | "ad",
    notes: lead.notes ?? "",
  });
  const [details, setDetails] = useState<LeadDetailsState>(() => leadDetailsToState(lead));

  const isWalkIn = form.source === "walk-in";
  const missingWalkInDate = isWalkIn && !details.walkInDate;
  const missingParent = details.segment === "kid" && (!details.parentName.trim() || !details.parentAge);

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.updateLead({
        leadId: lead.id,
        ...form,
        ...detailsToInput(details),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the lead.");
        return;
      }
      toast.success("Lead updated");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>
            {lead.fullName ?? "Unnamed lead"} — update the details your team captured.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lead-name">Name</Label>
              <Input
                id="edit-lead-name"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lead-phone">Mobile</Label>
              <Input
                id="edit-lead-phone"
                value={form.contact}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contact: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                }
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lead-email">Email</Label>
            <Input
              id="edit-lead-email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={form.source}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, source: value as typeof prev.source }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="ad">Ad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lead-notes">Notes</Label>
            <Textarea
              id="edit-lead-notes"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <LeadDetailsFields
            value={details}
            onChange={setDetails}
            showWalkInDate={isWalkIn}
            idPrefix="edit-lead"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !form.fullName || !form.contact || missingWalkInDate || missingParent}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status select ────────────────────────────────────────────────────────────

export function LeadStatusSelect({ leadId, status }: { leadId: number; status: string }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [value, setValue] = useState(status);

  const onChange = (next: string) => {
    setValue(next);
    startSaving(async () => {
      const result = await portalCall.updateLeadStatus(leadId, next);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the lead.");
        setValue(status);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}

// ─── Consultant assignment ────────────────────────────────────────────────────

export function AssignConsultantSelect({
  leadId,
  employeeId,
  employees,
}: {
  leadId: number;
  employeeId: number | null;
  employees: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const onChange = (value: string) => {
    startSaving(async () => {
      const result = await portalCall.assignConsultant(
        leadId,
        value === "none" ? null : Number(value),
      );
      if (!result.ok) {
        toast.error(result.error ?? "Could not assign the lead.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <Select
      value={employeeId ? String(employeeId) : "none"}
      onValueChange={onChange}
      disabled={saving}
    >
      <SelectTrigger className="h-8 w-[160px] text-xs">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">
          Unassigned
        </SelectItem>
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={String(employee.id)} className="text-xs">
            {employee.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Convert ──────────────────────────────────────────────────────────────────

export function ConvertLeadButton({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    const confirmed = window.confirm(
      "Create a member account from this lead and open the activation wizard?",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await portalCall.convertLead(leadId);
      if (!result.ok || !result.memberId) {
        toast.error(result.error ?? "Could not convert the lead.");
        return;
      }
      toast.success("Member created — pick a plan to activate");
      router.push(`/app/activate?member=${result.memberId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="secondary" onClick={convert} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Convert
    </Button>
  );
}
