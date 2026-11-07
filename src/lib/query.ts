export type WhereOp =
  | "equals"
  | "not_equals"
  | "contains"
  | "like"
  | "in"
  | "not_in"
  | "greater_than"
  | "greater_than_equal"
  | "less_than"
  | "less_than_equal"
  | "exists"
  | "near";

export type WhereCondition = {
  field: string;
  op: WhereOp;
  value: string | number | boolean | (string | number)[];
};

export type WhereGroup =
  | WhereCondition
  | { and: WhereGroup[] }
  | { or: WhereGroup[] };

export type QueryParams = {
  page?: number;
  limit?: number;
  sort?: string;
  depth?: number;
  where?: WhereGroup;
  /** Field projection (`select[field]=true`) — trims payloads on list views. */
  select?: Record<string, boolean>;
  /** Search across these fields with `like` — converted to an OR group. */
  search?: { fields: string[]; value: string };
  extra?: Record<string, string | number | boolean | undefined>;
};

const isCondition = (node: WhereGroup): node is WhereCondition =>
  typeof node === "object" && node !== null && "field" in node;

function applyWhere(
  node: WhereGroup,
  key: string,
  params: URLSearchParams,
) {
  if (isCondition(node)) {
    const raw = Array.isArray(node.value) ? node.value.join(",") : node.value;
    params.append(`${key}[${node.field}][${node.op}]`, String(raw));
    return;
  }

  if ("and" in node) {
    node.and.forEach((child, index) => applyWhere(child, `${key}[and][${index}]`, params));
    return;
  }

  node.or.forEach((child, index) => applyWhere(child, `${key}[or][${index}]`, params));
}

export function buildSearchParams(query: QueryParams): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page !== undefined) params.append("page", String(query.page));
  if (query.limit !== undefined) params.append("limit", String(query.limit));
  if (query.sort) params.append("sort", query.sort);
  if (query.depth !== undefined) params.append("depth", String(query.depth));
  if (query.select) {
    Object.entries(query.select).forEach(([field, include]) => {
      if (include) params.append(`select[${field}]`, "true");
    });
  }

  if (query.search && query.search.value.trim()) {
    const group: WhereGroup = {
      or: query.search.fields.map((field) => ({
        field,
        op: "like" as const,
        value: query.search!.value.trim(),
      })),
    };
    applyWhere(group, "where", params);
  }

  if (query.where) {
    applyWhere(query.where, "where", params);
  }

  if (query.extra) {
    Object.entries(query.extra).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
  }

  return params;
}

/** Convenience builders for the most common filters. */
export const where = {
  eq: (field: string, value: WhereCondition["value"]): WhereCondition => ({
    field,
    op: "equals",
    value,
  }),
  not: (field: string, value: WhereCondition["value"]): WhereCondition => ({
    field,
    op: "not_equals",
    value,
  }),
  like: (field: string, value: WhereCondition["value"]): WhereCondition => ({
    field,
    op: "like",
    value,
  }),
  in: (field: string, value: (string | number)[]): WhereCondition => ({
    field,
    op: "in",
    value,
  }),
  gte: (field: string, value: WhereCondition["value"]): WhereCondition => ({
    field,
    op: "greater_than_equal",
    value,
  }),
  lt: (field: string, value: WhereCondition["value"]): WhereCondition => ({
    field,
    op: "less_than",
    value,
  }),
  exists: (field: string, value = true): WhereCondition => ({
    field,
    op: "exists",
    value,
  }),
  and: (...clauses: WhereGroup[]): WhereGroup => ({ and: clauses }),
  or: (...clauses: WhereGroup[]): WhereGroup => ({ or: clauses }),
};

/** ISO date helpers used across list filters (Payload date fields are ISO). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDayISO(date = new Date()): string {
  return `${toISODate(date)}T00:00:00.000Z`;
}

export function endOfDayISO(date = new Date()): string {
  return `${toISODate(date)}T23:59:59.999Z`;
}
