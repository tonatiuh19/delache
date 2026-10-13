import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";

/**
 * Load notifications once when the shell mounts (page load / hard refresh).
 * No interval or focus polling — badges refresh when the user reloads or
 * opens the Notifications page (which fetches on its own).
 */
export function useNotificationPolling(
  enabled: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchThunk: (...args: any[]) => any,
): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    void dispatch(fetchThunk());
  }, [enabled, dispatch, fetchThunk]);
}
