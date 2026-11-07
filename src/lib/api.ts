import { buildSearchParams, type QueryParams } from "./query";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://ultim-server.vercel.app";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type PaginatedDocs<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

type FetchOptions = {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  /** Set to skip the Next data cache (default) — portal data must be live. */
  cache?: RequestCache;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const qs = options.query ? `?${buildSearchParams(options.query).toString()}` : "";
  const res = await fetch(`${API_URL}${normalised}${qs}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = data as {
      message?: string;
      error?: string;
      errors?: { message?: string }[];
    } | null;
    throw new ApiError(
      err?.errors?.[0]?.message ?? err?.message ?? err?.error ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  return data as T;
}

/** Thin CRUD helpers around the Payload REST API. */
export const payload = {
  list<T>(collection: string, query: QueryParams = {}, token?: string | null) {
    return apiFetch<PaginatedDocs<T>>(`/api/${collection}`, { query, token });
  },
  get<T>(collection: string, id: string | number, query: QueryParams = {}, token?: string | null) {
    return apiFetch<T>(`/api/${collection}/${id}`, { query, token });
  },
  create<T>(collection: string, body: unknown, token?: string | null) {
    return apiFetch<T>(`/api/${collection}`, { method: "POST", body, token });
  },
  update<T>(
    collection: string,
    id: string | number,
    body: unknown,
    token?: string | null,
    query?: QueryParams,
  ) {
    return apiFetch<T>(`/api/${collection}/${id}`, { method: "PATCH", body, token, query });
  },
  remove(collection: string, id: string | number, token?: string | null) {
    return apiFetch<{ message?: string }>(`/api/${collection}/${id}`, {
      method: "DELETE",
      token,
    });
  },
};

/** Uploads a file to Payload's media collection (S3-backed). */
export async function uploadMedia(
  token: string,
  file: Blob,
  filename: string,
  alt: string,
): Promise<Media> {
  const form = new FormData();
  form.append("file", file, filename);
  form.append("alt", alt);

  const res = await fetch(`${API_URL}/api/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = (await res.json().catch(() => null)) as
    | { doc?: Media; message?: string; error?: string }
    | null;

  if (!res.ok || !data?.doc) {
    throw new ApiError(data?.message ?? data?.error ?? "Upload failed", res.status);
  }

  return data.doc;
}

// ─── Shared domain types (mirrors of the Payload collections we render) ───────

export type PayloadUser = {
  id: number;
  email: string;
  fullName?: string | null;
  role: "admin" | "partner" | "consultant" | "member";
  phone?: string | null;
  tenant?: { id: number; Facility?: string | null; city?: string | null } | number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Tenant = {
  id: number;
  Facility?: string | null;
  description?: string | null;
  city?: string | null;
  location?: [number, number] | null;
  facilityImages?: { id?: string; facilityImage?: Media | number | null }[] | null;
  activities?:
    | {
        id?: string;
        activity: string;
        category?: "fitness" | "sports" | "health" | null;
        creditsPer60Minutes?: number | null;
        active?: boolean | null;
        courts?: { id?: string; name: string }[] | null;
        capacityPerCourt?: number | null;
      }[]
    | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Media = {
  id: number;
  url?: string | null;
  alt?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizes?: Record<string, { url?: string | null; width?: number | null }> | null;
};

export type MembershipPlan = {
  id: number;
  tenant?: number | Tenant | null;
  planName: string;
  description?: string | null;
  category?: "fitness" | "sports" | "health" | null;
  supportedActivities?: string[] | null;
  planPrice?: number | null;
  discountedPrice?: number | null;
  MembershipPlanMaximumDiscount?: number | null;
  Duration?: "1" | "3" | "6" | "12" | null;
  creditsOffered?: number | null;
  maxMembers?: number | null;
  active?: boolean | null;
  numberOfMinutesPerDay?: number | null;
  timeSlots?: { id?: string; slotStartTime?: string | null }[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MembershipDoc = {
  id: number;
  tenant?: number | Tenant | null;
  member?: PayloadUser | number | null;
  membershipPlan?: MembershipPlan | number | null;
  membershipPlanName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  amountPaid?: number | null;
  amountDue?: number | null;
  discountOffered?: number | null;
  availableCredits?: number | null;
  transactions?: { id?: string; transaction?: TransactionDoc | number | null }[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TransactionDoc = {
  id: number;
  tenant?: number | Tenant | null;
  transactionDate?: string | null;
  member?: PayloadUser | number | null;
  /** FK to the pass this payment settles (portal links payments here). */
  membership?: MembershipDoc | number | null;
  membershipPlan?: MembershipPlan | number | null;
  transactionAmount?: number | null;
  paymentMethod?: "cash" | "card" | "cheque" | "bankTransfer" | "upi" | null;
  Consultant?: EmployeeDoc | number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BookingDoc = {
  id: number;
  tenant?: number | Tenant | null;
  member?: PayloadUser | number | null;
  membership?: MembershipDoc | number | null;
  activity?: string | null;
  sessionDate?: string | null;
  sessionTime?: string | null;
  court?: string | null;
  duration?: number | null;
  qrCode?: string | null;
  successfulCheckedInTime?: string | null;
  successfulCheckedOutTime?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeDoc = {
  id: number;
  tenant?: number | Tenant | null;
  employee?: PayloadUser | number | null;
  /** Virtual field from the backend: employee.fullName */
  employeeName?: string | null;
  joiningDate?: string | null;
  gender?: "male" | "female" | null;
  contact?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AppReleaseDoc = {
  id: number;
  platform: "android" | "ios";
  version: string;
  buildNumber?: number | null;
  minimumVersion?: string | null;
  minimumBuildNumber?: number | null;
  updateMode: "optional" | "force";
  storeUrl: string;
  title?: string | null;
  message?: string | null;
  releaseNotes?: string | null;
  active?: boolean | null;
  releasedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EnquiryDoc = {
  id: number;
  tenant?: number | Tenant | null;
  enquiryConsultant?: EmployeeDoc | number | null;
  fullName?: string | null;
  gender?: "male" | "female" | null;
  email?: string | null;
  contact?: string | null;
  source?: "walk-in" | "website" | "referral" | "ad" | null;
  status?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
