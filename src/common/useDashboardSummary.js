import { useCallback, useEffect, useRef, useState } from "react";
import DashboardService from "../services/DashboardService";

const EMPTY = { data: null, loading: false, error: "", updatedAt: null };

/**
 * GET /Dashboard/summary, held once for the whole app shell. MainLayout owns
 * it (the module rail shows its figures) and hands it to the Dashboard page
 * through the Outlet context, so the endpoint isn't called twice per page.
 *
 * A failed refresh keeps the last good figures and reports the error beside
 * them; only the first load can leave `data` empty.
 *
 * @param {boolean} enabled  only roles allowed to read the summary fetch it
 * @returns {{ data: object|null, loading: boolean, error: string, updatedAt: Date|null, refresh: () => Promise<void> }}
 */
export default function useDashboardSummary(enabled) {
  const [state, setState] = useState(() => ({ ...EMPTY, loading: enabled }));
  const request = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    // A slower, older reply must not overwrite a newer one.
    const id = ++request.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await DashboardService.getSummary();
      if (id !== request.current) return;
      setState({ data: data || null, loading: false, error: "", updatedAt: new Date() });
    } catch (e) {
      if (id !== request.current) return;
      setState((s) => ({ ...s, loading: false, error: e?.message || "Could not load the dashboard summary." }));
    }
  }, [enabled]);

  // Signing in as another role must not keep the previous user's figures.
  useEffect(() => {
    if (!enabled) {
      request.current += 1;
      setState(EMPTY);
    }
  }, [enabled]);

  return { ...state, refresh };
}
