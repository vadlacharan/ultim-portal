import type { WhereGroup } from "./query";

/** Combines clauses with AND, dropping empties (admins have no tenant scope). */
export function combineWhere(
  ...clauses: (WhereGroup | undefined)[]
): WhereGroup | undefined {
  const active = clauses.filter(Boolean) as WhereGroup[];
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return { and: active };
}
