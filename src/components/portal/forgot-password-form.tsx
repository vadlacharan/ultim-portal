"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiFetch("/api/users/forgot-password", {
        method: "POST",
        body: { email: values.email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Never reveal whether an account exists.
        setSent(true);
        return;
      }
      toast.error("Could not send the reset email. Please try again.");
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <MailCheck className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Check your inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            If that email belongs to an account, a reset link is on its way.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href="/login">
            <ArrowLeft className="size-4" /> Back to sign in
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" placeholder="you@facility.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Send reset link
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <a href="/login">
          <ArrowLeft className="size-4" /> Back to sign in
        </a>
      </Button>
    </form>
  );
}
