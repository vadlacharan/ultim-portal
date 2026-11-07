import { ApiError, payload, uploadMedia, type Media, type Tenant } from "@/lib/api";
import { requireApiAuth } from "@/lib/scope";

export type FacilityActivityInput = {
  activity: string;
  category: "fitness" | "sports" | "health" | "";
  creditsPer60Minutes: number;
  active: boolean;
  capacityPerCourt: number;
  courts: string[];
};

export type FacilityInput = {
  Facility: string;
  description: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  activities: FacilityActivityInput[];
  /** Media IDs in display order. */
  imageIds: number[];
};

export type ActionResult = { ok: boolean; error?: string };

const ACTIVITY_VALUES = ["gym", "badminton", "pickleball", "cricket", "swimming"];

function validate(input: FacilityInput): string | null {
  if (!input.Facility?.trim()) return "Facility name is required.";
  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    return "Latitude must be between -90 and 90.";
  }
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    return "Longitude must be between -180 and 180.";
  }
  for (const activity of input.activities) {
    if (!ACTIVITY_VALUES.includes(activity.activity)) {
      return `Unknown activity "${activity.activity}".`;
    }
    if (!activity.creditsPer60Minutes || activity.creditsPer60Minutes <= 0) {
      return `Credit rate for ${activity.activity} must be greater than 0.`;
    }
  }
  return null;
}

export async function updateFacilityAction(
  tenantId: number,
  input: FacilityInput,
): Promise<ActionResult> {
  const { user, token } = await requireApiAuth();
  if (user.role === "consultant") {
    return { ok: false, error: "Consultants can't edit the facility profile." };
  }
  if (user.role !== "admin" && user.tenantId !== tenantId) {
    return { ok: false, error: "You can only edit your own facility." };
  }

  const error = validate(input);
  if (error) return { ok: false, error };

  const location =
    input.latitude != null && input.longitude != null
      ? [input.longitude, input.latitude]
      : null;

  try {
    await payload.update<Tenant>(
      "tenants",
      tenantId,
      {
        Facility: input.Facility.trim(),
        description: input.description?.trim() || null,
        city: input.city?.trim() || null,
        location,
        activities: input.activities.map((activity) => ({
          activity: activity.activity,
          category: activity.category || undefined,
          creditsPer60Minutes: activity.creditsPer60Minutes,
          active: activity.active,
          capacityPerCourt: activity.capacityPerCourt || 1,
          courts: activity.courts
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name })),
        })),
        facilityImages: input.imageIds.map((id) => ({ facilityImage: id })),
      },
      token,
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not save the facility.",
    };
  }
}

export async function uploadFacilityImage(
  formData: FormData,
): Promise<{ ok: boolean; media?: Media; error?: string }> {
  const { user, token } = await requireApiAuth();
  if (user.role === "consultant") {
    return { ok: false, error: "Consultants can't upload facility photos." };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Images must be smaller than 8 MB." };
  }

  const filename = file instanceof File && file.name ? file.name : "facility.jpg";
  try {
    const media = await uploadMedia(token, file, filename, `${user.tenantName ?? "Facility"} photo`);
    return { ok: true, media };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Upload failed. Try again.",
    };
  }
}
