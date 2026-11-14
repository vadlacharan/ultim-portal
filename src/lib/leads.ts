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

/** Sports / fitness activities a lead can be interested in. */
export const LEAD_ACTIVITIES = [
  { value: "gym", label: "Gym" },
  { value: "badminton", label: "Badminton" },
  { value: "pickleball", label: "PickleBall" },
  { value: "cricket", label: "Box Cricket" },
  { value: "swimming", label: "Swimming" },
] as const;

/** Who the lead is: an adult, a parent bringing kids, or a kid. */
export const LEAD_SEGMENTS = [
  { value: "adult", label: "Adult" },
  { value: "parent", label: "Parent" },
  { value: "kid", label: "Kid" },
] as const;

export const LEAD_GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "not-specified", label: "Prefer not to say" },
] as const;

export type LeadSegment = (typeof LEAD_SEGMENTS)[number]["value"];
export type LeadGender = (typeof LEAD_GENDERS)[number]["value"];
