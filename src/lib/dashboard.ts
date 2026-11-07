import { payload, type BookingDoc, type MembershipDoc, type PayloadUser, type TransactionDoc } from "./api";
import { istDateString, tenantScope } from "./scope";
import type { SessionUser } from "./session";
import type { QueryParams, WhereGroup } from "./query";
import { computePassDue } from "./dues";
import { combineWhere } from "./where-utils";

const OPEN_LEAD_STATUSES = ["new", "contacted", "Interested"];
const GYM_ALL_DAY = "GYM_ALL_DAY";

export async function countDocs(
  collection: string,
  query: QueryParams,
  token: string,
): Promise<number> {
  const res = await payload.list(collection, { ...query, limit: 1, depth: 0 }, token);
  return res.totalDocs ?? 0;
}

/** Pages through a collection (cap protects the dashboard from huge tenants). */
export async function fetchAll<T>(
  collection: string,
  query: QueryParams,
  token: string,
  maxPages = 10,
): Promise<T[]> {
  const limit = 100;
  const docs: T[] = [];
  let page = 1;

  for (; page <= maxPages; page += 1) {
    const res = await payload.list<T>(collection, { ...query, limit, page }, token);
    docs.push(...(res.docs ?? []));
    if (!res.hasNextPage) break;
  }

  return docs;
}

export type DashboardActivity = {
  id: string;
  kind: "payment" | "activation" | "booking";
  title: string;
  subtitle: string;
  amount?: number | null;
  at?: string | null;
};

export type DashboardFilters = {
  days: 7 | 30 | 90;
  activity?: string;
  tenantId?: number;
};

export type DashboardKpis = {
  activePasses: number;
  revenue: number;
  bookings: number;
  checkInRate: number;
  newMembers: number;
  bookingsToday: number;
  openLeads: number;
  duesOutstanding: number;
};

export type DashboardData = {
  kpis: DashboardKpis;
  revenueSeries: { date: string; label: string; revenue: number }[];
  activitySeries: { activity: string; label: string; bookings: number }[];
  peakHours: { hour: number; label: string; bookings: number }[];
  paymentMix: { method: string; label: string; amount: number }[];
  activity: DashboardActivity[];
};

const userName = (value: TransactionDoc["member"] | MembershipDoc["member"]): string => {
  if (!value || typeof value === "number") return "Member";
  return (value as PayloadUser).fullName?.trim() || (value as PayloadUser).email || "Member";
};

const planName = (value: TransactionDoc["membershipPlan"] | MembershipDoc["membershipPlan"]): string => {
  if (!value || typeof value === "number") return "Membership plan";
  return value.planName || "Membership plan";
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  bankTransfer: "Bank transfer",
  upi: "UPI",
  other: "Other",
};

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "Other";

const startOfRangeISO = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return `${istDateString(date)}T00:00:00.000+05:30`;
};

const endOfTodayISO = (): string => `${istDateString()}T23:59:59.999+05:30`;

export async function getDashboardData(
  user: SessionUser,
  token: string,
  filters: DashboardFilters,
): Promise<DashboardData> {
  const { days, activity, tenantId } = filters;
  const scope: WhereGroup | undefined =
    user.role === "admin" && tenantId
      ? { field: "tenant", op: "equals", value: tenantId }
      : tenantScope(user);

  const startISO = startOfRangeISO(days);
  const endISO = endOfTodayISO();
  const nowISO = new Date().toISOString();
  const today = istDateString();

  const activityWhere: WhereGroup | undefined = activity
    ? { field: "activity", op: "equals", value: activity }
    : undefined;

  const [activePasses, newMembers, openLeads, bookings, transactions] = await Promise.all([
    countDocs(
      "memberships",
      { where: combineWhere(scope, { field: "endDate", op: "greater_than_equal", value: nowISO }) },
      token,
    ),
    countDocs(
      "memberships",
      { where: combineWhere(scope, { field: "createdAt", op: "greater_than_equal", value: startISO }) },
      token,
    ),
    countDocs(
      "enquiry",
      { where: combineWhere(scope, { field: "status", op: "in", value: OPEN_LEAD_STATUSES }) },
      token,
    ),
    fetchAll<BookingDoc>(
      "bookings",
      {
        where: combineWhere(
          scope,
          { field: "sessionDate", op: "greater_than_equal", value: startISO },
          { field: "sessionDate", op: "less_than_equal", value: endISO },
          activityWhere,
        ),
        depth: 0,
        select: {
          activity: true,
          sessionTime: true,
          duration: true,
          status: true,
          successfulCheckedInTime: true,
          successfulCheckedOutTime: true,
          sessionDate: true,
          court: true,
        },
        sort: "sessionDate",
      },
      token,
      20,
    ),
    fetchAll<TransactionDoc>(
      "transactions",
      {
        where: combineWhere(scope, {
          or: [
            { field: "transactionDate", op: "greater_than_equal", value: startISO },
            { field: "createdAt", op: "greater_than_equal", value: startISO },
          ],
        }),
        depth: 0,
        select: {
          transactionAmount: true,
          transactionDate: true,
          paymentMethod: true,
          createdAt: true,
        },
        sort: "-transactionDate",
      },
      token,
      20,
    ),
  ]);

  const liveBookings = bookings.filter(
    (booking) => String(booking.status ?? "").toLowerCase() !== "cancelled",
  );

  const bookingsToday = liveBookings.filter(
    (booking) => booking.sessionDate && istDateString(new Date(booking.sessionDate)) === today,
  ).length;

  const checkedIn = liveBookings.filter((booking) => booking.successfulCheckedInTime).length;
  const checkInRate = liveBookings.length > 0 ? (checkedIn / liveBookings.length) * 100 : 0;

  // ── Revenue: daily buckets for the selected range ─────────────────────────
  const buckets = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    buckets.set(istDateString(date), 0);
  }

  let revenue = 0;
  for (const transaction of transactions) {
    const amount = Number(transaction.transactionAmount ?? 0);
    revenue += amount;
    const stamp = transaction.transactionDate ?? transaction.createdAt;
    if (!stamp) continue;
    const key = istDateString(new Date(stamp));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }

  const revenueSeries = Array.from(buckets.entries()).map(([date, value]) => ({
    date,
    label: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(`${date}T12:00:00+05:30`)),
    revenue: value,
  }));

  // ── Bookings by activity ──────────────────────────────────────────────────
  const activityCounts = new Map<string, number>();
  for (const booking of liveBookings) {
    const key = String(booking.activity ?? "other").toLowerCase();
    activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
  }
  const activitySeries = Array.from(activityCounts.entries())
    .map(([key, count]) => ({ activity: key, label: titleCase(key), bookings: count }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8);

  // ── Peak hours (05:00–22:00) ──────────────────────────────────────────────
  const hourCounts = new Map<number, number>();
  for (let hour = 5; hour <= 22; hour += 1) hourCounts.set(hour, 0);
  for (const booking of liveBookings) {
    const time = String(booking.sessionTime ?? "");
    if (!time || time === GYM_ALL_DAY) continue;
    const hour = Number(time.slice(0, 2));
    if (hourCounts.has(hour)) hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const peakHours = Array.from(hourCounts.entries()).map(([hour, count]) => ({
    hour,
    label: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`,
    bookings: count,
  }));

  // ── Payment mix ───────────────────────────────────────────────────────────
  const methodTotals = new Map<string, number>();
  for (const transaction of transactions) {
    const method = String(transaction.paymentMethod ?? "other");
    methodTotals.set(method, (methodTotals.get(method) ?? 0) + Number(transaction.transactionAmount ?? 0));
  }
  const paymentMix = Array.from(methodTotals.entries())
    .filter(([, amount]) => amount > 0)
    .map(([method, amount]) => ({
      method,
      label: PAYMENT_LABELS[method] ?? titleCase(method),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Outstanding dues across passes (active + expired) ─────────────────────
  const [duesPasses, duesPayments] = await Promise.all([
    fetchAll<MembershipDoc>("memberships", { where: scope, depth: 1, sort: "-createdAt" }, token, 10),
    fetchAll<TransactionDoc>("transactions", { where: scope, depth: 0 }, token, 10),
  ]);

  const duesPaymentsByMember = new Map<number, TransactionDoc[]>();
  for (const payment of duesPayments) {
    const memberId = Number(
      typeof payment.member === "object" && payment.member ? payment.member.id : payment.member,
    );
    if (!memberId) continue;
    if (!duesPaymentsByMember.has(memberId)) duesPaymentsByMember.set(memberId, []);
    duesPaymentsByMember.get(memberId)!.push(payment);
  }

  const duesOutstanding = duesPasses.reduce((sum, pass) => {
    const memberId = Number(
      typeof pass.member === "object" && pass.member ? pass.member.id : pass.member,
    );
    return sum + computePassDue(pass, duesPaymentsByMember.get(memberId) ?? []);
  }, 0);

  // ── Recent activity: latest payments + activations ────────────────────────
  const [latestTx, latestMemberships] = await Promise.all([
    payload.list<TransactionDoc>(
      "transactions",
      { where: scope, sort: "-createdAt", limit: 6, depth: 2 },
      token,
    ),
    payload.list<MembershipDoc>(
      "memberships",
      { where: scope, sort: "-createdAt", limit: 4, depth: 2 },
      token,
    ),
  ]);

  const activityFeed: DashboardActivity[] = [
    ...(latestTx.docs ?? []).map((tx) => ({
      id: `tx-${tx.id}`,
      kind: "payment" as const,
      title: `${userName(tx.member)} paid`,
      subtitle: planName(tx.membershipPlan),
      amount: tx.transactionAmount ?? 0,
      at: tx.createdAt,
    })),
    ...(latestMemberships.docs ?? []).map((membership) => ({
      id: `ms-${membership.id}`,
      kind: "activation" as const,
      title: `${userName(membership.member)} activated`,
      subtitle: membership.membershipPlanName ?? planName(membership.membershipPlan),
      at: membership.createdAt,
    })),
  ]
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 8);

  return {
    kpis: {
      activePasses,
      revenue,
      bookings: liveBookings.length,
      checkInRate,
      newMembers,
      bookingsToday,
      openLeads,
      duesOutstanding,
    },
    revenueSeries,
    activitySeries,
    peakHours,
    paymentMix,
    activity: activityFeed,
  };
}
