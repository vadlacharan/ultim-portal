/** Shared lead pipeline options (plain module — safe for server components). */
export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "Interested", label: "Interested" },
  { value: "convertee", label: "Converted" },
  { value: "dropped", label: "Dropped" },
  { value: "notInterested", label: "Not interested" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];
