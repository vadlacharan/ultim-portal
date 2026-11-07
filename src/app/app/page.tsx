"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AppIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/bookings");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
