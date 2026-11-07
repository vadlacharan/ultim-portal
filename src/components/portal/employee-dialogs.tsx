"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, UserPlus } from "lucide-react";
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
import { portalCall } from "@/lib/portal-client";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  gender: "male" as "male" | "female",
  joiningDate: "",
  contact: "",
  address: "",
};

export function AddEmployeeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState(emptyForm);

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.createEmployee(form);
      if (!result.ok) {
        toast.error(result.error ?? "Could not add the employee.");
        return;
      }
      toast.success(result.message ?? "Employee added");
      setForm(emptyForm);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a front-desk consultant</DialogTitle>
          <DialogDescription>
            Creates a portal login bound to your facility. They can activate members and scan at the
            gate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Full name</Label>
              <Input
                id="emp-name"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Mobile</Label>
              <Input
                id="emp-phone"
                value={form.phone}
                inputMode="numeric"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emp-email">Work email</Label>
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-password">Temporary password</Label>
              <Input
                id="emp-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="min. 8 characters"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, gender: value as "male" | "female" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-joining">Joining date</Label>
              <Input
                id="emp-joining"
                type="date"
                value={form.joiningDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, joiningDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-contact">Contact number</Label>
              <Input
                id="emp-contact"
                value={form.contact}
                onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-address">Address</Label>
            <Input
              id="emp-address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditEmployeeDialog({
  employeeId,
  initial,
}: {
  employeeId: number;
  initial: {
    gender: "male" | "female";
    joiningDate: string;
    contact: string;
    address: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [form, setForm] = useState(initial);

  const submit = () => {
    startSaving(async () => {
      const result = await portalCall.updateEmployee(employeeId, form);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save changes.");
        return;
      }
      toast.success("Employee updated");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit employee">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>Employment details for this consultant.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, gender: value as "male" | "female" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-joining">Joining date</Label>
              <Input
                id="edit-joining"
                type="date"
                value={form.joiningDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, joiningDate: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-contact">Contact</Label>
            <Input
              id="edit-contact"
              value={form.contact}
              onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
