"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/portal/auth-provider";
import { PageHeader } from "@/components/portal/page-header";
import { ActivationWizard } from "@/components/portal/activation-wizard";
import { payload, type PayloadUser } from "@/lib/api";
import type { MemberSearchResult } from "@/lib/portal/actions/activate";

export default function ActivatePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [presetMember, setPresetMember] = useState<MemberSearchResult | undefined>();

  const memberParam = searchParams.get("member");
  const planParam = searchParams.get("plan");
  const paymentOnly = searchParams.get("payment") === "1";
  const presetPlanId = planParam ? Number(planParam) : undefined;

  useEffect(() => {
    if (!token || !memberParam) {
      setPresetMember(undefined);
      return;
    }
    let cancelled = false;

    payload
      .get<PayloadUser>("users", Number(memberParam), { depth: 0 }, token)
      .then((member) => {
        if (cancelled) return;
        setPresetMember({
          id: member.id,
          name: member.fullName?.trim() || "Member",
          phone: member.phone ?? null,
          email: member.email,
          hasAccount: true,
        });
      })
      .catch(() => {
        if (!cancelled) setPresetMember(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [token, memberParam]);

  return (
    <>
      <PageHeader
        title={paymentOnly ? "Record a payment" : "Activate membership"}
        description={
          paymentOnly
            ? "Log a payment against an existing member — the ledger updates instantly."
            : "The desk flow: find the member, pick a plan, take payment and grant credits."
        }
      />
      <ActivationWizard
        presetMember={presetMember}
        presetPlanId={presetPlanId}
        paymentOnly={paymentOnly}
      />
    </>
  );
}
