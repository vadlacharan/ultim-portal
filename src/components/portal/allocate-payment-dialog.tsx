"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { portalCall } from "@/lib/portal-client";

type PassOption = {
  id: number;
  planName: string;
  isActive: boolean;
  due: number;
};

/**
 * Re-allocates an existing payment to a membership pass (fixes payments that
 * were recorded without a pass target). The pass ledgers recalculate on save.
 */
export function AllocatePaymentDialog({
  transactionId,
  amount,
  passes,
  currentPassId,
  onAllocated,
  compact = false,
}: {
  transactionId: number;
  amount: number;
  passes: PassOption[];
  currentPassId?: number | null;
  /** Lets the host page refetch locally instead of a full SSR refresh. */
  onAllocated?: () => void;
  /** Icon-only trigger for dense single-line payment rows. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [target, setTarget] = useState<string>(
    currentPassId ? String(currentPassId) : passes[0] ? String(passes[0].id) : "none",
  );

  const submit = () => {
    setOpen(false);
    const toastId = toast.loading("Updating payment…");
    startSaving(async () => {
      const result = await portalCall.allocatePayment(
        transactionId,
        target === "none" ? null : Number(target),
      );
      if (!result.ok) {
        toast.error(result.error ?? "Could not update the payment.", { id: toastId });
        setOpen(true);
        return;
      }
      toast.success(result.message ?? "Payment updated", { id: toastId });
      if (onAllocated) {
        onAllocated();
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            title={currentPassId ? "Re-link this payment to another pass" : "Link this payment to a pass"}
          >
            <Link2 className="size-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-xs">
            <Link2 className="size-3.5" />
            {currentPassId ? "Re-link" : "Link to pass"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Allocate payment</DialogTitle>
          <DialogDescription>
            ₹{amount} — choose the pass this payment settles. Paid and due figures recalculate
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {passes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This member has no passes yet — activate one first.
            </p>
          )}
          {passes.map((pass) => {
            const selected = target === String(pass.id);
            return (
              <button
                key={pass.id}
                type="button"
                onClick={() => setTarget(String(pass.id))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary/50 bg-primary/8"
                    : "border-border hover:border-border hover:bg-accent",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pass.planName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pass.isActive ? "Active" : "Expired"}
                    {pass.due > 0 ? ` · ₹${pass.due} due` : " · settled"}
                  </p>
                </div>
                {currentPassId === pass.id && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Linked
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setTarget("none")}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
              target === "none"
                ? "border-primary/50 bg-primary/8"
                : "border-border hover:border-border hover:bg-accent",
            )}
          >
            General payment (not linked to a pass)
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || passes.length === 0}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
