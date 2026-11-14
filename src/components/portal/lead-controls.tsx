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
  LeadSection,
  emptyLeadDetails,
  leadDetailsToState,
  type LeadDetailsState,
} from "@/components/portal/lead-details-fields";
import type { EnquiryDoc } from "@/lib/api";

const detailsToInput = (details: LeadDetailsState) => ({
  tenant: details.tenant ? Number(details.tenant) : null,
  age: details.age === "" ? null : Number(details.age),
  gender: (details.gender || null) as "male" | "female" | "other" | "not-specified" | null,
  segment: details.segment as "adult" | "parent" | "kid",
  parentName: details.parentName,
  parentAge: details.parentAge === "" ? null : Number(details.parentAge),
  interestedActivity: details.interestedActivity || null,
  interestedPlan: details.interestedPlan ? Number(details.interestedPlan) : null,
  walkInDate: details.walkInDate || null,
});

const fieldLabel = "text-xs font-medium text-muted-foreground";

type LeadFormState = {
  fullName: string;
  contact: string;
  email: string;
  source: "walk-in" | "website" | "referral" | "ad";
  notes: string;
};

const emptyForm: LeadFormState = {
  fullName: "",
  contact: "",
  email: "",
  source: "walk-in",
  notes: "",
};

/**
 * Shared form body for adding and editing a lead. Keeping one component means
 * the two dialogs can never drift apart.
 */
function LeadForm({
  form,
  onFormChange,
  details,
  onDetailsChange,
  idPrefix,
}: {
  form: LeadFormState;
  onFormChange: (next: LeadFormState) => void;
  details: LeadDetailsState;
  onDetailsChange: (next: LeadDetailsState) => void;
  idPrefix: string;
}) {
  const isWalkIn = form.source === "walk-in";

  return (
    <div className="space-y-6">
      <LeadSection title="Contact" hint="How do we reach them?">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={fieldLabel} htmlFor={`${idPrefix}-name`}>
              Name <span className="text-primary">*</span>
            </Label>
            <Input
              id={`${idPrefix}-name`}
              value={form.fullName}
              onChange={(event) => onFormChange({ ...form, fullName: event.target.value })}
              placeholder="Rahul Sharma"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label className={fieldLabel} htmlFor={`${idPrefix}-phone`}>
              Mobile <span className="text-primary">*</span>
            </Label>
            <Input
              id={`${idPrefix}-phone`}
              value={form.contact}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  contact: event.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              placeholder="9876543210"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={fieldLabel} htmlFor={`${idPrefix}-email`}>
            Email
          </Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={form.email}
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            placeholder="rahul@example.com"
            autoComplete="off"
          />
        </div>
      </LeadSection>

      <LeadSection title="Source" hint="Where did this lead come from?">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Select
              value={form.source}
              onValueChange={(value) =>
                onFormChange({ ...form, source: value as LeadFormState["source"] })
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

          {isWalkIn ? (
            <div className="space-y-2">
              <Label className={fieldLabel} htmlFor={`${idPrefix}-walk-in-date`}>
                Walk-in date <span className="text-primary">*</span>
              </Label>
              <Input
                id={`${idPrefix}-walk-in-date`}
                type="date"
                value={details.walkInDate}
                onChange={(event) => onDetailsChange({ ...details, walkInDate: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      </LeadSection>

      <LeadDetailsFields value={details} onChange={onDetailsChange} idPrefix={idPrefix} />

      <LeadSection title="Notes">
        <Textarea
          id={`${idPrefix}-notes`}
          rows={3}
          value={form.notes}
          onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
          placeholder="Interested in the badminton 3-month plan, starts next week…"
        />
      </LeadSection>
    </div>
  );
}

// ─── New lead ─────────────────────────────────────────────────────────────────

export function NewLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [details, setDetails] = useState<LeadDetailsState>(emptyLeadDetails);

  const isWalkIn = form.source === "walk-in";
  const isKid = details.segment === "kid";
  const problems: string[] = [];
  if (!form.fullName.trim()) problems.push("name");
  if (!form.contact.trim()) problems.push("mobile");
  if (isWalkIn && !details.walkInDate) problems.push("walk-in date");
  if (isKid && !details.parentName.trim()) problems.push("parent name");
  if (isKid && !details.parentAge.trim()) problems.push("parent age");

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
      setForm(emptyForm);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Capture who walked in, what they want and who they came with — then convert them into a
            member in one click.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <LeadForm
            form={form}
            onFormChange={setForm}
            details={details}
            onDetailsChange={setDetails}
            idPrefix="lead"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {problems.length > 0
              ? `Add the ${problems.join(", ")} to save this lead.`
              : "Everything looks good — ready to save."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || problems.length > 0}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save lead
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit lead ────────────────────────────────────────────────────────────────

export function EditLeadDialog({
  lead,
  trigger,
}: {
  lead: EnquiryDoc;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState<LeadFormState>({
    fullName: lead.fullName ?? "",
    contact: lead.contact ?? "",
    email: lead.email ?? "",
    source: (lead.source ?? "walk-in") as LeadFormState["source"],
    notes: lead.notes ?? "",
  });
  const [details, setDetails] = useState<LeadDetailsState>(() => leadDetailsToState(lead));

  const isWalkIn = form.source === "walk-in";
  const isKid = details.segment === "kid";
  const problems: string[] = [];
  if (!form.fullName.trim()) problems.push("name");
  if (!form.contact.trim()) problems.push("mobile");
  if (isWalkIn && !details.walkInDate) problems.push("walk-in date");
  if (isKid && !details.parentName.trim()) problems.push("parent name");
  if (isKid && !details.parentAge.trim()) problems.push("parent age");

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>
            {lead.fullName ?? "Unnamed lead"} — update what your team captured.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <LeadForm
            form={form}
            onFormChange={setForm}
            details={details}
            onDetailsChange={setDetails}
            idPrefix="edit-lead"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {problems.length > 0
              ? `Add the ${problems.join(", ")} to save this lead.`
              : "Everything looks good — ready to save."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || problems.length > 0}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
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
    <Select value={value} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
