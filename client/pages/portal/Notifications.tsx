import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import MetaHelmet from "@/components/MetaHelmet";
import PortalPageHeader from "@/components/portal/PortalPageHeader";
import { ListCardSkeleton } from "@/components/portal/PortalSkeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/store/slices/portalSlice";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, loadingNotifications } = useAppSelector(
    (s) => s.portal,
  );

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <MetaHelmet title={t("portal.notifications")} noindex />
      <PortalPageHeader
        eyebrow={t("notifications.eyebrow")}
        title={
          <>
            {t("portal.notifications")}
            {unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                {unreadCount}
              </span>
            ) : null}
          </>
        }
        description={t("notifications.subtitle")}
        actions={
          <button
            type="button"
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
            onClick={() => void dispatch(markAllNotificationsRead())}
          >
            {t("notifications.markAllRead")}
          </button>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loadingNotifications ? (
          <ListCardSkeleton rows={6} className="border-0 shadow-none" />
        ) : notifications.length === 0 ? (
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
                        void dispatch(markNotificationRead(n.publicUuid))
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
