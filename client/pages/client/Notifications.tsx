import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import { ContentPageSkeleton } from "@/components/portal/PortalSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientNotifications,
  markAllClientNotificationsRead,
  markClientNotificationRead,
} from "@/store/slices/clientSlice";

export default function ClientNotificationsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, loadingNotifications } = useAppSelector(
    (s) => s.client,
  );

  useEffect(() => {
    void dispatch(fetchClientNotifications());
  }, [dispatch]);

  if (loadingNotifications && notifications.length === 0) {
    return <ContentPageSkeleton variant="inbox" />;
  }

  return (
    <div className="space-y-6">
      <MetaHelmet title={t("client.notifications")} noindex />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("notifications.eyebrow")}
          </p>
          <h1 className="mt-1 font-[Manrope] text-2xl font-extrabold tracking-tight text-foreground">
            {t("client.notifications")}
            {unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                {unreadCount}
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("client.notificationsSubtitle")}
          </p>
        </div>
        <button
          type="button"
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
          onClick={() => void dispatch(markAllClientNotificationsRead())}
        >
          {t("notifications.markAllRead")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {notifications.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {t("notifications.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.publicUuid}
                className={`px-4 py-3 ${n.readAt ? "" : "bg-secondary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {n.body}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.readAt ? (
                    <button
                      type="button"
                      className="shrink-0 text-[10px] font-bold uppercase text-primary"
                      onClick={() =>
                        void dispatch(markClientNotificationRead(n.publicUuid))
                      }
                    >
                      {t("notifications.markRead")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
