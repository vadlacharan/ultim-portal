"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LandingEnquiryForm() {
  const [form, setForm] = useState({ fullName: "", contact: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/enquiry/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;

      if (!res.ok || data?.ok === false) {
        setError(data?.message ?? data?.error ?? "Could not submit right now — please try again.");
        setState("idle");
        return;
      }

      setState("sent");
    } catch {
      setError("Network error — please try again.");
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <div className="surface-glass flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--success)]/12 text-[var(--success)]">
          <CheckCircle2 className="size-6" />
        </span>
        <h3 className="text-lg font-semibold">Thanks — we&apos;ll be in touch</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Our partnerships team typically responds within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface-glass space-y-4 rounded-2xl p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="landing-name">Your name</Label>
          <Input
            id="landing-name"
            required
            minLength={2}
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            placeholder="Rahul Sharma"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-phone">Phone</Label>
          <Input
            id="landing-phone"
            required
            value={form.contact}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            placeholder="98765 43210"
            inputMode="tel"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="landing-email">Email (optional)</Label>
        <Input
          id="landing-email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="you@facility.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="landing-message">Tell us about your facility</Label>
        <Textarea
          id="landing-message"
          rows={3}
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          placeholder="Name, city, sports offered, number of courts…"
        />
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Become a partner
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        By submitting you agree to be contacted about ULTIM partnerships.
      </p>
    </form>
  );
}
