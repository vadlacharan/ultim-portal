"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const onClick = () => {
    setBusy(true);
    logout();
    router.replace("/login");
  };

  return (
    <Button variant="outline" className="w-full" onClick={onClick} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Sign out of this device
    </Button>
  );
}
