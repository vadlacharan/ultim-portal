import { ApiError, apiFetch } from "@/lib/api";
import { requireApiAuth } from "@/lib/scope";

export type BookingActionResult = { ok: boolean; error?: string; message?: string };

const REASON_MESSAGES: Record<string, string> = {
  "qr-not-found": "This booking's QR is not recognised.",
  "partner-tenant-mismatch": "This booking belongs to another facility.",
  "too-early": "Too early — the check-in window opens closer to the session time.",
  "booking-window-expired": "The check-in window for this session has closed.",
  "booking-not-for-today": "This booking is scheduled for another day.",
  "booking-cancelled": "This booking is cancelled.",
  "booking-expired": "This booking has expired.",
  "booking-completed": "This session is already completed.",
  "invalid-session-datetime": "The session time for this booking is invalid.",
  "qr-expired": "This QR has expired. Ask the member to reopen the app — or try again.",
};

/**
 * Manual gate check-in / check-out from the desk, using the same verification
 * pipeline as the QR scanner (time windows, tenant match, state transitions).
 */
export async function checkInOutAction(
  bookingId: number,
  qrCode: string,
): Promise<BookingActionResult> {
  const { user, token } = await requireApiAuth();

  if (user.role !== "partner") {
    return {
      ok: false,
      error: "Only the facility partner can verify gate entries. Use the scanner as the partner account.",
    };
  }

  if (!qrCode) {
    return { ok: false, error: "This booking has no QR pass yet." };
  }

  try {
    // The gate only accepts codes generated within the member app's refresh
    // window (+5s). Rotate the pass first so a desk check-in is never rejected
    // for an old code - this uses the same endpoint the member app uses.
    let scanData = qrCode;
    try {
      const fresh = await apiFetch<{ token?: string }>("/api/bookings/" + bookingId + "/generate-qr", {
        method: "POST",
        body: {},
        token,
      });
      if (fresh?.token) scanData = fresh.token;
    } catch {
      /* fall back to the stored code - verify will explain if it is stale */
    }

    const result = await apiFetch<{
      allow?: boolean;
      reason?: string;
      message?: string;
    }>("/api/bookings/verify-qr", {
      method: "POST",
      body: { scanData },
      token,
    });

    if (result?.allow) {
      const isCheckout = /check.?out/i.test(String(result?.message ?? ""));
      return {
        ok: true,
        message: isCheckout ? "Session checked out" : "Member checked in",
      };
    }

    const reason = String(result?.reason ?? "");
    return {
      ok: false,
      error: REASON_MESSAGES[reason] ?? result?.message ?? "The gate check was denied.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Gate check failed. Please try again.",
    };
  }
}

/** Cancel a booking and refund its credits (backend `/bookings/:id/cancel`). */
export async function cancelBookingAction(bookingId: number): Promise<BookingActionResult> {
  const { token } = await requireApiAuth();

  try {
    const result = await apiFetch<{ success?: boolean; refundedCredits?: number }>(
      `/api/bookings/${bookingId}/cancel`,
      { method: "POST", token },
    );

    return {
      ok: true,
      message:
        result?.refundedCredits && result.refundedCredits > 0
          ? `Booking cancelled — ${result.refundedCredits} credits refunded`
          : "Booking cancelled",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ApiError ? err.message : "Could not cancel the booking.",
    };
  }
}
