"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dumbbell, Loader2, MapPin, ScanLine, Wallet } from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { LoginForm } from "@/components/portal/login-form";
import { Logo } from "@/components/portal/logo";

const HIGHLIGHTS = [
  { icon: Wallet, text: "Activate memberships & record payments at the desk" },
  { icon: Dumbbell, text: "Manage plans, courts, credit rates and slots" },
  { icon: ScanLine, text: "Track bookings, check-ins and member activity" },
  { icon: MapPin, text: "Keep your facility profile & location up to date" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const next = searchParams.get("next") ?? undefined;

  useEffect(() => {
    if (!loading && user) {
      router.replace(next && next.startsWith("/app") ? next : "/app/bookings");
    }
  }, [loading, user, router, next]);

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_85%_-10%,rgba(255,106,26,0.22),transparent_60%),radial-gradient(700px_380px_at_-10%_110%,rgba(255,106,26,0.08),transparent_55%)]" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative space-y-8">
          <p className="arena-eyebrow">Ultim partner portal</p>
          <h1 className="arena-display text-[clamp(48px,5vw,72px)] font-semibold text-foreground">
            Your facility,
            <br />
            <span className="text-primary">one control room.</span>
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">
          ULTIM © {new Date().getFullYear()} · Partner & Admin portal
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8">
            <p className="arena-eyebrow">Staff sign in</p>
            <h2 className="arena-display mt-2 text-[clamp(34px,4vw,44px)] font-semibold text-foreground">
              Sign in to your workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use the email and password shared with you by ULTIM.
            </p>
          </div>
          <LoginForm nextPath={next} />
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Members sign in through the ULTIM mobile app.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
