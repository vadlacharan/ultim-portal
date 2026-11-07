"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building, Loader2, UserPlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { portalCall } from "@/lib/portal-client";

export function NewTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState({ Facility: "", city: "", description: "" });

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.createTenant(form);
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the facility.");
        return;
      }
      toast.success(result.message ?? "Facility created");
      setForm({ Facility: "", city: "", description: "" });
      setOpen(false);
      router.refresh();
      if (result.tenantId) router.push(`/app/tenants/view?id=${result.tenantId}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Building className="size-4" />
          New facility
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a facility</DialogTitle>
          <DialogDescription>
            Creates the tenant. Next step: attach a partner account so they can manage it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Facility name</Label>
            <Input
              id="tenant-name"
              value={form.Facility}
              onChange={(event) => setForm((prev) => ({ ...prev, Facility: event.target.value }))}
              placeholder="Iron Yard Fitness Studio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-city">City</Label>
            <Input
              id="tenant-city"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="Hyderabad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-description">Description</Label>
            <Textarea
              id="tenant-description"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !form.Facility}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Create facility
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddPartnerDialog({ tenantId }: { tenantId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.createPartner({ tenantId, ...form });
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the partner.");
        return;
      }
      toast.success("Partner account created");
      setForm({ fullName: "", email: "", password: "" });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" />
          Add partner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create the partner account</DialogTitle>
          <DialogDescription>
            The owner login for this facility — full access to its plans, members and bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="partner-name">Full name</Label>
            <Input
              id="partner-name"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-email">Work email</Label>
            <Input
              id="partner-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-password">Temporary password</Label>
            <Input
              id="partner-password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="min. 8 characters"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !form.fullName || !form.email}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Create login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
