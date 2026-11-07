"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronsUpDown, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/session";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  partner: "Partner",
  consultant: "Consultant",
};

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { logout: signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const logout = async () => {
    setBusy(true);
    signOut();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border/60 py-1 pl-1 pr-2.5 transition-colors hover:bg-white/5">
        <Avatar className="size-7">
          <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[140px] truncate text-sm sm:block">{user.name}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
              <ShieldCheck className="size-3" />
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            if (!busy) void logout();
          }}
          className="text-destructive focus:text-destructive"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
