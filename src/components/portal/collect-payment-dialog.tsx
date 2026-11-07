"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
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

type PaymentMethod = "cash" | "card" | "cheque" | "bankTransfer" | "upi";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bankTransfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];

/**
 * Collect a payment against a specific pass (active or expired). Links the
 * transaction so the pass's paid/due figures recalculate automatically.
 */
export function CollectPaymentDialog({
  membershipId,
  planName,
  amountDue,
  trigger,
  onSettled,
}: {
  membershipId: number;
  planName: string;
  amountDue: number;
  trigger?: React.ReactNode;
  /** Called with the fresh balance so the host page can update instantly. */
  onSettled?: (result: { newDue?: number; message?: string }) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [amount, setAmount] = useState(String(amountDue));
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const submit = () => {
    const value = Number(amount || 0);
    if (value <= 0) return;

    // Optimistic: close immediately, confirm in the background.
    setOpen(false);
    const toastId = toast.loading("Recording payment…");

    startSaving(async () => {
      const result = await portalCall.settlePassDue({
        membershipId,
        amount: value,
        paymentMethod: method,
        currentDue: amountDue,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not record the payment.", { id: toastId });
        setOpen(true);
        return;
      }
      toast.success(`${planName}: ${result.message ?? "payment recorded"}`, { id: toastId });
      if (onSettled) {
        onSettled({ newDue: result.newDue, message: result.message });
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="secondary"
            title={`Record a payment and link it to ${planName}`}
          >
            <Wallet className="size-4" />
            Collect payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            {amountDue > 0 ? `₹${amountDue} outstanding on ` : "No dues on "}
            <span className="font-medium text-foreground">{planName}</span>. This payment is
            automatically linked to this pass — its paid and due figures update on save.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="collect-amount">Amount (₹)</Label>
            <Input
              id="collect-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter less for a part-payment.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !amount || Number(amount) <= 0}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
