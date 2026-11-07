"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/portal/logo";
import { SidebarNav } from "@/components/portal/sidebar-nav";
import type { StaffRole } from "@/lib/session";

export function MobileNav({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-r-border/60 bg-sidebar p-0">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="text-left">
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <SidebarNav role={role} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
