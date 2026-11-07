"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { portalCall } from "@/lib/portal-client";

const ROLES = ["admin", "partner", "consultant", "member"] as const;

export function UserRoleSelect({
  userId,
  role,
}: {
  userId: number;
  role: "admin" | "partner" | "consultant" | "member";
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [value, setValue] = useState(role);

  const onChange = (next: string) => {
    const previous = value;
    setValue(next as typeof value);
    startSaving(async () => {
      const result = await portalCall.updateUserRole(userId, next as (typeof ROLES)[number]);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the role.");
        setValue(previous);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={saving}>
        <SelectTrigger className="h-8 w-[130px] text-xs capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((option) => (
            <SelectItem key={option} value={option} className="text-xs capitalize">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function UserTenantSelect({
  userId,
  tenantId,
  tenants,
}: {
  userId: number;
  tenantId: number | null;
  tenants: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const onChange = (value: string) => {
    startSaving(async () => {
      const result = await portalCall.updateUserTenant(userId, value === "none" ? null : Number(value));
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the facility link.");
        return;
      }
      toast.success(value === "none" ? "Facility unlinked" : "Facility linked");
      router.refresh();
    });
  };

  return (
    <Select
      value={tenantId ? String(tenantId) : "none"}
      onValueChange={onChange}
      disabled={saving}
    >
      <SelectTrigger className="h-8 w-[170px] text-xs">
        <SelectValue placeholder="No facility" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">
          No facility
        </SelectItem>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={String(tenant.id)} className="text-xs">
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
