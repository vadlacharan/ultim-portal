import { ApiError, payload, type AppReleaseDoc } from "@/lib/api";
import { requireApiAdmin } from "@/lib/scope";

export type AppReleaseInput = {
  platform: "android" | "ios";
  version: string;
  buildNumber: number | null;
  minimumVersion: string;
  minimumBuildNumber: number | null;
  updateMode: "optional" | "force";
  storeUrl: string;
  title: string;
  message: string;
  releaseNotes: string;
  active: boolean;
};

export type ActionResult = { ok: boolean; error?: string; id?: number };

const VERSION_PATTERN = /^\d+(\.\d+){0,3}$/;

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

function validate(input: AppReleaseInput): string | null {
  if (!["android", "ios"].includes(input.platform)) return "Choose a platform.";
  if (!VERSION_PATTERN.test(input.version.trim())) {
    return "Version must look like 1.2.3.";
  }
  if (input.minimumVersion.trim() && !VERSION_PATTERN.test(input.minimumVersion.trim())) {
    return "Minimum version must look like 1.2.3.";
  }
  if (
    input.minimumVersion.trim() &&
    compareVersions(input.minimumVersion.trim(), input.version.trim()) > 0
  ) {
    return "Minimum supported version cannot be higher than the release version.";
  }
  if (input.buildNumber != null && (!Number.isFinite(input.buildNumber) || input.buildNumber < 0)) {
    return "Build number must be 0 or more.";
  }
  if (
    input.minimumBuildNumber != null &&
    (!Number.isFinite(input.minimumBuildNumber) || input.minimumBuildNumber < 0)
  ) {
    return "Minimum build must be 0 or more.";
  }
  if (
    input.buildNumber != null &&
    input.minimumBuildNumber != null &&
    input.minimumBuildNumber > input.buildNumber
  ) {
    return "Minimum build cannot be higher than the release build.";
  }
  if (!input.storeUrl.trim()) return "Store URL is required.";

  try {
    const url = new URL(input.storeUrl.trim());
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
  } catch {
    return "Store URL must be a valid http(s) link.";
  }

  if (!["optional", "force"].includes(input.updateMode)) return "Choose an update mode.";
  return null;
}

function toPayload(input: AppReleaseInput) {
  return {
    platform: input.platform,
    version: input.version.trim().replace(/^v/i, ""),
    buildNumber: input.buildNumber,
    minimumVersion: input.minimumVersion.trim().replace(/^v/i, "") || null,
    minimumBuildNumber: input.minimumBuildNumber,
    updateMode: input.updateMode,
    storeUrl: input.storeUrl.trim(),
    title: input.title.trim() || null,
    message: input.message.trim() || null,
    releaseNotes: input.releaseNotes.trim() || null,
    active: input.active,
  };
}

export async function createAppReleaseAction(input: AppReleaseInput): Promise<ActionResult> {
  const { token } = await requireApiAdmin();
  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    const created = await payload.create<AppReleaseDoc>("app-releases", toPayload(input), token);
    return { ok: true, id: created.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not publish the release.",
    };
  }
}

export async function updateAppReleaseAction(
  releaseId: number,
  input: AppReleaseInput,
): Promise<ActionResult> {
  const { token } = await requireApiAdmin();
  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    await payload.update<AppReleaseDoc>("app-releases", releaseId, toPayload(input), token);
    return { ok: true, id: releaseId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not save the release.",
    };
  }
}

export async function setAppReleaseActiveAction(
  releaseId: number,
  active: boolean,
): Promise<ActionResult> {
  const { token } = await requireApiAdmin();

  try {
    await payload.update<AppReleaseDoc>("app-releases", releaseId, { active }, token);
    return { ok: true, id: releaseId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not update the release.",
    };
  }
}
