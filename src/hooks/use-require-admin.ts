"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/portal/auth-provider";

/** Client-side replacement for the old `requireAdmin()` page guard. */
export function useRequireAdmin() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace("/app/bookings");
    }
  }, [loading, user, isAdmin, router]);

  return { user, loading, isAdmin };
}
