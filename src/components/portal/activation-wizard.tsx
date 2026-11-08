"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleUser,
  CreditCard,
  Loader2,
  Phone,
  Search,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { MembershipPlan } from "@/lib/api";
import { durationLabel, formatINR, formatNumber } from "@/lib/format";
import { istDateString } from "@/lib/dates";
import { portalCall } from "@/lib/portal-client";
import type {
  ActivateInput,
  MemberPass,
  MemberSearchResult,
  MemberSnapshot,
} from "@/lib/portal/actions/activate";

type Step = 0 | 1 | 2 | 3;
const STEPS = ["Member", "Plan", "Payment", "Review"] as const;

const PAYMENT_METHODS: ActivateInput["paymentMethod"][] = [
  "cash",
  "upi",
  "card",
  "bankTransfer",
  "cheque",
];

type Props = {
  /** Pre-selected member when coming from a member profile. */
  presetMember?: MemberSearchResult;
  /** Pre-selected plan id (e.g. converting a lead). */
  presetPlanId?: number;
  /** Skip straight to payments (no membership) — used from member profiles. */
  paymentOnly?: boolean;
};

export function ActivationWizard({ presetMember, presetPlanId, paymentOnly = false }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(presetMember ? 1 : 0);
  const [member, setMember] = useState<MemberSearchResult | null>(presetMember ?? null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);

  // Payment state
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState<ActivateInput["paymentMethod"]>("cash");
  const [startDate, setStartDate] = useState(istDateString());

  const [activating, startActivating] = useTransition();
  const [success, setSuccess] = useState<{ membershipId?: number } | null>(null);

  // Member context: existing passes + dues (payment targeting & desk awareness)
  const [memberPasses, setMemberPasses] = useState<MemberPass[]>([]);
  const [snapshot, setSnapshot] = useState<MemberSnapshot | null>(null);
  const [passTarget, setPassTarget] = useState<string>("none"); // "none" | pass id

  // Member search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMember, setNewMember] = useState({ fullName: "", phone: "", email: "" });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    portalCall.listActivePlans()
      .then((list) => {
        setPlans(list);
        if (presetPlanId) {
          const match = list.find((item) => item.id === presetPlanId);
          if (match) selectPlan(match);
        }
      })
      .catch(() => toast.error("Could not load plans."))
      .finally(() => setPlansLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const list = await portalCall.searchMembers(query);
        setResults(list);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  useEffect(() => {
    if (!member) {
      setMemberPasses([]);
      setSnapshot(null);
      setPassTarget("none");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [passes, snap] = await Promise.all([
          portalCall.listMemberPasses(member.id),
          portalCall.memberSnapshot(member.id),
        ]);
        if (cancelled) return;
        setMemberPasses(passes);
        setSnapshot(snap);
        // Default the payment target to the pass with the largest due amount.
        const withDues = passes.filter((pass) => pass.amountDue > 0);
        setPassTarget(withDues.length > 0 ? String(withDues[0].id) : "none");
      } catch {
        if (!cancelled) {
          setMemberPasses([]);
          setSnapshot(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [member]);

  const selectedPass = useMemo(
    () => memberPasses.find((pass) => String(pass.id) === passTarget) ?? null,
    [memberPasses, passTarget],
  );

  // Payments against a pass default to the outstanding amount.
  useEffect(() => {
    if (!paymentOnly) return;
    if (selectedPass) setAmount(String(selectedPass.amountDue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passTarget, paymentOnly]);

  const sellingPrice = useMemo(() => {
    if (!plan) return 0;
    const actual = Number(plan.planPrice ?? 0);
    const discounted = plan.discountedPrice != null ? Number(plan.discountedPrice) : null;
    return discounted != null && discounted < actual ? discounted : actual;
  }, [plan]);

  const selectPlan = (selected: MembershipPlan) => {
    setPlan(selected);
    const actual = Number(selected.planPrice ?? 0);
    const discounted =
      selected.discountedPrice != null ? Number(selected.discountedPrice) : null;
    const price = discounted != null && discounted < actual ? discounted : actual;
    setAmount(String(price));
    setDiscount("0");
  };

  const maxDiscount = Number(plan?.MembershipPlanMaximumDiscount ?? 0);
  const discountValue = Number(discount || 0);
  const amountValue = Number(amount || 0);
  const amountDue = Math.max(0, sellingPrice - discountValue - amountValue);

  const nextStep = (current: Step): Step =>
    paymentOnly && current === 0 ? 2 : ((Math.min(3, current + 1) as Step));
  const prevStep = (current: Step): Step =>
    paymentOnly && current === 2 ? 0 : ((Math.max(0, current - 1)) as Step);

  const canContinue =
    step === 0
      ? !!member
      : step === 1
        ? !!plan
        : step === 2
          ? amountValue > 0 || amountValue === 0
          : true;

  const handleCreateMember = async () => {
    setCreating(true);
    try {
      const result = await portalCall.createMember(newMember);
      if (!result.ok || !result.member) {
        toast.error(result.error ?? "Could not create the member.");
        return;
      }
      setMember(result.member);
      setResults([]);
      setQuery("");
      toast.success(`${result.member.name} added`);
    } finally {
      setCreating(false);
    }
  };

  const submit = () => {
    if (!member || (!paymentOnly && !plan)) return;

    startActivating(async () => {
      if (paymentOnly) {
        const result = await portalCall.recordPayment({
          memberId: member.id,
          planId: selectedPass?.planId ?? plan?.id ?? null,
          membershipId: selectedPass?.id ?? null,
          amount: amountValue,
          paymentMethod: method,
          currentDue: selectedPass?.amountDue,
        });
        if (!result.ok) {
          toast.error(result.error ?? "Could not record the payment.");
          return;
        }
        toast.success(`Payment of ${formatINR(amountValue)} recorded`);
        router.push(`/app/members/view?id=${member.id}`);
        return;
      }

      const result = await portalCall.activateMembership({
        memberId: member.id,
        memberName: member.name,
        planId: plan!.id,
        planName: plan!.planName,
        amount: amountValue,
        paymentMethod: method,
        discountOffered: discountValue,
        startDateISO: new Date(`${startDate}T09:00:00+05:30`).toISOString(),
      });

      if (!result.ok) {
        toast.error(result.error ?? "Activation failed.");
        return;
      }

      setSuccess({ membershipId: result.membershipId });
      router.refresh();
    });
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <Card className="mx-auto max-w-xl border-border bg-card">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--success)]/12 text-[var(--success)]">
            <BadgeCheck className="size-7" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Membership activated</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {member?.name} · {plan?.planName} · {formatNumber(plan?.creditsOffered)} credits granted
            </p>
          </div>
          <div className="mt-2 flex gap-3">
            <Button variant="outline" onClick={() => router.push(`/app/members/view?id=${member?.id}`)}>
              View member
            </Button>
            <Button
              onClick={() => {
                setSuccess(null);
                setMember(null);
                setPlan(null);
                setAmount("");
                setDiscount("0");
                setQuery("");
                setResults([]);
                setStep(0);
              }}
            >
              Activate another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      {!paymentOnly && (
        <ol className="flex items-center gap-2">
          {STEPS.map((label, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => index < step && setStep(index as Step)}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary/40 bg-primary/12 text-primary"
                        : "border-border/70 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </button>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    active ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="h-px flex-1 bg-border/60" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Step 0 — Member */}
      {step === 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Find or add the member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {member ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CircleUser className="size-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.phone ?? member.email}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMember(null)}>
                    Change
                  </Button>
                </div>
                {snapshot && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-primary/15 pt-2.5 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">{snapshot.activePasses}</span>{" "}
                      active pass{snapshot.activePasses === 1 ? "" : "es"}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">{snapshot.creditsLeft}</span>{" "}
                      credits left
                    </span>
                    {snapshot.dues > 0 && (
                      <span className="text-gold">
                        {formatINR(snapshot.dues)} outstanding
                      </span>
                    )}
                    {memberPasses.length > snapshot.activePasses && (
                      <span>{memberPasses.length - snapshot.activePasses} expired</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by phone, name or email…"
                    className="pl-9"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                {results.length > 0 && (
                  <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setMember(result);
                          setResults([]);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                      >
                        <CircleUser className="size-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{result.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {result.phone ?? result.email}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/50" />
                      </button>
                    ))}
                  </div>
                )}

                {query.trim().length >= 3 && !searching && results.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No member found — add them as a new member below.
                  </p>
                )}

                <Separator className="bg-border/50" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserPlus className="size-4 text-primary" />
                    New member
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="nm-name">Full name</Label>
                      <Input
                        id="nm-name"
                        value={newMember.fullName}
                        onChange={(event) =>
                          setNewMember((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        placeholder="Ananya Rao"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nm-phone">Mobile</Label>
                      <Input
                        id="nm-phone"
                        value={newMember.phone}
                        onChange={(event) =>
                          setNewMember((prev) => ({
                            ...prev,
                            phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        placeholder="9876543210"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nm-email">Email (optional)</Label>
                      <Input
                        id="nm-email"
                        value={newMember.email}
                        onChange={(event) =>
                          setNewMember((prev) => ({ ...prev, email: event.target.value }))
                        }
                        placeholder="ananya@example.com"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCreateMember}
                    disabled={creating || !newMember.fullName || newMember.phone.length !== 10}
                  >
                    {creating ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    Add member
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    They can later sign in on the ULTIM app with this mobile number via OTP.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1 — Plan (activation only) */}
      {step === 1 && !paymentOnly && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Choose a plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plansLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
                No active plans. Create one under Plans first.
              </p>
            ) : (
              plans.map((item) => {
                const actual = Number(item.planPrice ?? 0);
                const discounted = item.discountedPrice != null ? Number(item.discountedPrice) : null;
                const hasDiscount = discounted != null && discounted < actual;
                const selected = plan?.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectPlan(item)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-4 text-left transition-colors",
                      selected
                        ? "border-primary/50 bg-primary/8"
                        : "border-border hover:border-border hover:bg-accent",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.planName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {durationLabel(item.Duration)} · {formatNumber(item.creditsOffered)} credits ·{" "}
                          {(item.supportedActivities ?? []).join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatINR(hasDiscount ? discounted : actual)}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatINR(actual)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Payment */}
      {step === 2 && (
        <Card className="border-border bg-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Payment</CardTitle>
            {plan && <Badge variant="outline">{plan.planName}</Badge>}
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {paymentOnly && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Apply payment to</Label>
                {memberPasses.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 px-4 py-3 text-xs text-muted-foreground">
                    This member has no passes yet — record a general payment, or activate a plan
                    from the Members page instead.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {memberPasses.map((pass) => {
                      const selected = passTarget === String(pass.id);
                      return (
                        <button
                          key={pass.id}
                          type="button"
                          onClick={() => setPassTarget(String(pass.id))}
                          className={cn(
                            "flex w-full flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                            selected
                              ? "border-primary/50 bg-primary/8"
                              : "border-border hover:border-border hover:bg-accent",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{pass.planName}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {pass.isActive ? "Active" : "Expired"} ·{" "}
                              {pass.availableCredits} credits left
                            </p>
                          </div>
                          <Badge
                            className={
                              pass.amountDue > 0
                                ? "border-transparent bg-gold/15 text-gold"
                                : "border-transparent bg-[var(--success)]/12 text-[var(--success)]"
                            }
                          >
                            {pass.amountDue > 0
                              ? `${formatINR(pass.amountDue)} due`
                              : "Settled"}
                          </Badge>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPassTarget("none")}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        passTarget === "none"
                          ? "border-primary/50 bg-primary/8"
                          : "border-border hover:border-border hover:bg-accent",
                      )}
                    >
                      <Wallet className="size-4 text-muted-foreground" />
                      General payment (not linked to a pass)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount collected (₹)</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
              />
              {plan && (
                <p className="text-[11px] text-muted-foreground">
                  Plan price {formatINR(sellingPrice)} — enter less for a part-payment.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={method}
                onValueChange={(value) => setMethod(value as ActivateInput["paymentMethod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "bankTransfer"
                        ? "Bank transfer"
                        : option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!paymentOnly && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pay-discount">Discount offered (₹)</Label>
                  <Input
                    id="pay-discount"
                    type="number"
                    min={0}
                    max={maxDiscount || undefined}
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    inputMode="numeric"
                  />
                  <p
                    className={cn(
                      "text-[11px]",
                      discountValue > maxDiscount ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    Max allowed on this plan: {formatINR(maxDiscount)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-start">Start date</Label>
                  <Input
                    id="pay-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <div className="surface-glass space-y-2 rounded-xl px-4 py-3 text-sm">
                {paymentOnly && selectedPass && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Settling</span>
                    <span className="truncate font-medium">{selectedPass.planName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan price</span>
                  <span>{formatINR(paymentOnly ? selectedPass?.amountDue ?? 0 : sellingPrice)}</span>
                </div>
                {!paymentOnly && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{formatINR(discountValue)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Collected now</span>
                  <span>{formatINR(amountValue)}</span>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between font-medium">
                  <span>Remaining due</span>
                  <span className={amountDue > 0 ? "text-gold" : "text-[var(--success)]"}>
                    {formatINR(amountDue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Review */}
      {step === 3 && member && (plan || paymentOnly) && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {paymentOnly ? "Review & record payment" : "Review & activate"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="surface-glass space-y-3 rounded-xl px-4 py-4 text-sm">
              <div className="flex items-center gap-3">
                <CircleUser className="size-4 text-primary" />
                <span className="font-medium">{member.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {member.phone ?? member.email}
                </span>
              </div>

              {paymentOnly ? (
                <>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center gap-3">
                    <Wallet className="size-4 text-primary" />
                    <span>{selectedPass ? selectedPass.planName : "General payment"}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {selectedPass
                        ? selectedPass.isActive
                          ? "Active pass"
                          : "Expired pass"
                        : "Not linked to a pass"}
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-4 text-primary" />
                    <span>Collecting</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatINR(amountValue)} via {method}
                    </span>
                  </div>
                  {selectedPass && (
                    <>
                      <Separator className="bg-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due after this payment</span>
                        <span
                          className={
                            Math.max(0, selectedPass.amountDue - amountValue) > 0
                              ? "font-medium text-gold"
                              : "text-[var(--success)]"
                          }
                        >
                          {formatINR(Math.max(0, selectedPass.amountDue - amountValue))}
                        </span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-4 text-primary" />
                    <span>{plan?.planName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {durationLabel(plan?.Duration)} · {formatNumber(plan?.creditsOffered)} credits
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center gap-3">
                    <Wallet className="size-4 text-primary" />
                    <span>Payment</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatINR(amountValue)} via {method} · discount {formatINR(discountValue)}
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due after payment</span>
                    <span
                      className={
                        amountDue > 0 ? "font-medium text-gold" : "text-[var(--success)]"
                      }
                    >
                      {formatINR(amountDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentOnly
                ? selectedPass
                  ? "The payment is linked to the pass — its paid amount and outstanding balance update automatically."
                  : "Recorded as a general payment against the member's ledger."
                : `This records the payment transaction and activates the pass with ${formatNumber(
                    plan?.creditsOffered,
                  )} credits. The member can start booking on the app immediately.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((current) => prevStep(current))}
          disabled={step === 0 || activating}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((current) => nextStep(current))}
            disabled={!canContinue || (step === 1 && !plan)}
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={activating || discountValue > maxDiscount}
          >
            {activating ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
            {paymentOnly ? "Record payment" : "Activate membership"}
          </Button>
        )}
      </div>
    </div>
  );
}
