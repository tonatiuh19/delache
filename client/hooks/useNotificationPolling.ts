import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";

const DEFAULT_INTERVAL_MS = 45_000;

/**
 * Keep notification badges fresh: initial fetch, interval poll, and
 * refetch on window focus / tab visible.
 */
export function useNotificationPolling(
  enabled: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchThunk: (...args: any[]) => any,
  intervalMs = DEFAULT_INTERVAL_MS,
): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void dispatch(fetchThunk());
    };

    tick();
    const id = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [enabled, dispatch, fetchThunk, intervalMs]);
}
