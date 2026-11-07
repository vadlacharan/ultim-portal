"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/portal/auth-provider";
import { usePortalRefresh } from "@/lib/portal-refresh";
import type { SessionUser } from "@/lib/session";

type QueryContext = { user: SessionUser; token: string };

/**
 * Client-side replacement for the old server `await payload.list(...)` pattern.
 * Refetches when the supplied deps change or a portal mutation succeeds.
 */
export function usePortalQuery<T>(
  loader: (context: QueryContext) => Promise<T>,
  deps: unknown[] = [],
) {
  const { user, token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    setError(null);

    try {
      setData(await loaderRef.current({ user, token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this page.");
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    void run();
    // The caller supplies the query dependencies explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  usePortalRefresh(run);

  return { data, loading, error, reload: run, user, token };
}
