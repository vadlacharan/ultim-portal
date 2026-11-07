"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { Logo } from "@/components/portal/logo";
import { MobileNav } from "@/components/portal/mobile-nav";
import { SidebarNav } from "@/components/portal/sidebar-nav";
import { UserMenu } from "@/components/portal/user-menu";
import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={user.role} />
        </div>
        <div className="border-t border-border/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Signed in as
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user.tenantName ?? (user.role === "admin" ? "ULTIM Admin" : "No facility linked")}
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <MobileNav role={user.role} />
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
              <Building2 className="size-3.5" />
            </span>
            <span className="truncate text-sm font-medium">
              {user.tenantName ?? (user.role === "admin" ? "All facilities" : "ULTIM")}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton cards={4} rows={6} />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
