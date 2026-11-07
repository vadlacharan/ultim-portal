"use client";

import { ForgotPasswordForm } from "@/components/portal/forgot-password-form";
import { Logo } from "@/components/portal/logo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll email you a secure link to set a new password.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
