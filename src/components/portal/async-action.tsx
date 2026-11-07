"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { portalPost } from "@/lib/portal-client";

type ActionVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";

/**
 * Runs a client-side portal mutation with a spinner and toast feedback.
 * Handlers return `{ ok, error?, message? }`.
 */
export function AsyncAction({
  portalAction,
  label,
  pendingLabel,
  icon,
  variant = "outline",
  size = "sm",
  confirmText,
  className,
  disabled = false,
  title,
}: {
  /** Serializable descriptor resolved by the client dispatcher. */
  portalAction: { action: string; input?: unknown };
  label: ReactNode;
  pendingLabel?: string;
  /**
   * Serialisable icon ELEMENT (e.g. `<LogIn className="size-4" />`). Component
   * references can't cross the server→client boundary, so always pass elements.
   */
  icon?: ReactNode;
  variant?: ActionVariant;
  size?: "sm" | "default" | "lg" | "icon";
  confirmText?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [busy, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  const onClick = () => {
    if (confirmText && typeof window !== "undefined" && !window.confirm(confirmText)) {
      return;
    }
    setRunning(true);
    startTransition(async () => {
      try {
        const result = await portalPost<{ ok: boolean; error?: string; message?: string }>(
          portalAction.action,
          portalAction.input,
        );
        if (result.ok) {
          if (result.message) toast.success(result.message);
        } else {
          toast.error(result.error ?? "Something went wrong");
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setRunning(false);
      }
    });
  };

  const isBusy = busy || running;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || isBusy}
      className={className}
      title={title}
    >
      {isBusy ? <Loader2 className="size-4 animate-spin" /> : icon}
      {isBusy && pendingLabel ? pendingLabel : label}
    </Button>
  );
}
