"use client";

import { useEffect } from "react";

const PORTAL_REFRESH_EVENT = "portal:refresh";

/** Notify every mounted portal screen that a mutation succeeded. */
export function refreshPortal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTAL_REFRESH_EVENT));
}

/** Subscribe a data loader to successful portal mutations. */
export function usePortalRefresh(callback: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => callback();
    window.addEventListener(PORTAL_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PORTAL_REFRESH_EVENT, handler);
  }, [callback]);
}
