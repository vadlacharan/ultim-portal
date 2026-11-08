"use client";

import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/portal/auth-provider";
import { PageHeader } from "@/components/portal/page-header";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/portal/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const rows = [
    { icon: UserRound, label: "Name", value: user.name },
    { icon: Mail, label: "Email", value: user.email },
    { icon: ShieldCheck, label: "Role", value: user.role },
    {
      icon: KeyRound,
      label: "Facility",
      value: user.tenantName ?? (user.role === "admin" ? "All facilities" : "Not linked"),
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your portal account and workspace preferences."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div className="flex items-center gap-3 px-1 py-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                    <p className="truncate text-sm">{value}</p>
                  </div>
                </div>
                <Separator className="bg-border/50" />
              </div>
            ))}
            <div className="px-1 pt-4 text-xs text-muted-foreground">
              Need to change your email or password? Contact ULTIM support — self-serve account
              editing arrives with the admin user tools.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Security</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {user.role === "admin" ? "Full access" : "Facility scoped"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Sessions last 30 days. Signing out clears the token from this browser immediately.
            </p>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
