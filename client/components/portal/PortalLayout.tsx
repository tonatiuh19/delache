import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe, logout } from "@/store/slices/authSlice";
import SessionRestoreFallback from "@/components/auth/SessionRestoreFallback";
import { fetchNotifications, fetchPendingReviews } from "@/store/slices/portalSlice";
import { useNotificationPolling } from "@/hooks/useNotificationPolling";
import { canManageAdmin, canManageFinance } from "@shared/rbac";
import { canAccessReviewsQueue } from "@shared/reviewQueueRules";
import MetaHelmet from "@/components/MetaHelmet";
import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";
import { PortalShellSkeleton } from "@/components/portal/PortalSkeletons";
import GlobalSearchBar from "@/components/portal/GlobalSearchBar";
import CasePortalSidebar from "@/components/portal/case-detail/CasePortalSidebar";
import { usePortalCaseContext } from "@/hooks/usePortalCaseContext";
import { fetchCaseDetail } from "@/store/slices/casesSlice";

const SIDEBAR_COLLAPSED_KEY = "delache_sidebar_collapsed";
const SIDEBAR_EXPANDED_W = 280;
const SIDEBAR_COLLAPSED_W = 88;

type NavGate = "staff" | "law_firm" | "finance" | "admin" | "reviews";

type NavItem = {
  to: string;
  end?: boolean;
  icon: typeof LayoutDashboard;
  labelKey: string;
  gate: NavGate;
};

type NavSection = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    id: "overview",
    labelKey: "portal.navSection.overview",
    items: [
      {
        to: "/portal",
        end: true,
        icon: LayoutDashboard,
        labelKey: "portal.dashboard",
        gate: "staff",
      },
      {
        to: "/portal/cases",
        end: true,
        icon: Briefcase,
        labelKey: "despacho.panel.title",
        gate: "law_firm",
      },
      {
        to: "/portal/firm-team",
        icon: Users,
        labelKey: "despacho.team.nav",
        gate: "law_firm",
      },
    ],
  },
  {
    id: "work",
    labelKey: "portal.navSection.work",
    items: [
      {
        to: "/portal/cases",
        icon: Briefcase,
        labelKey: "portal.cases",
        gate: "staff",
      },
      {
        to: "/portal/calendar",
        icon: CalendarDays,
        labelKey: "portal.calendar",
        gate: "staff",
      },
      {
        to: "/portal/documents",
        icon: FileText,
        labelKey: "portal.documents",
        gate: "staff",
      },
      {
        to: "/portal/reviews",
        icon: ClipboardList,
        labelKey: "portal.reviews",
        gate: "reviews",
      },
      {
        to: "/portal/finance",
        icon: Wallet,
        labelKey: "portal.finance",
        gate: "finance",
      },
    ],
  },
  {
    id: "admin",
    labelKey: "portal.navSection.admin",
    items: [
      {
        to: "/portal/team",
        icon: Users,
        labelKey: "portal.team",
        gate: "admin",
      },
      {
        to: "/portal/settings",
        icon: Settings,
        labelKey: "portal.settings",
        gate: "admin",
      },
    ],
  },
];

function userInitials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName || "").trim().charAt(0);
  const b = (lastName || "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "D";
}

function formatUnread(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export default function PortalLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, loading, sessionRestoreFailed } = useAppSelector(
    (s) => s.auth,
  );
  const { unreadCount, pendingReviewsTotal } = useAppSelector((s) => s.portal);
  const { selected, detailLoading } = useAppSelector((s) => s.cases);
  const { inCaseContext, isNewCase, publicUuid: casePublicUuid } =
    usePortalCaseContext();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebar, setDesktopSidebar] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setDesktopSidebar(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (token && !user) {
      void dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  useEffect(() => {
    if (!loading && !token) {
      navigate("/login", { replace: true });
    }
  }, [loading, token, navigate]);

  useNotificationPolling(Boolean(user), fetchNotifications);

  useEffect(() => {
    if (!user || user.actor !== "law_firm") return;
    const path = location.pathname;
    const allowed =
      path === "/portal" ||
      path.startsWith("/portal/cases") ||
      path.startsWith("/portal/notifications") ||
      path.startsWith("/portal/profile");
    if (!allowed) {
      navigate("/portal/cases", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const showReviewsBadge = canAccessReviewsQueue(user?.role);

  useEffect(() => {
    if (!user || user.actor !== "staff" || !showReviewsBadge) return;
    void dispatch(fetchPendingReviews({ limit: 1 }));
  }, [dispatch, user, showReviewsBadge]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!inCaseContext || !casePublicUuid) return;
    if (selected?.publicUuid === casePublicUuid) return;
    void dispatch(fetchCaseDetail(casePublicUuid));
  }, [dispatch, inCaseContext, casePublicUuid, selected?.publicUuid]);

  const caseSidebarLoading =
    inCaseContext &&
    casePublicUuid != null &&
    (detailLoading || selected?.publicUuid !== casePublicUuid);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/login", { replace: true });
  };

  if (sessionRestoreFailed && token && !user) {
    return (
      <SessionRestoreFallback onRetry={() => void dispatch(fetchMe())} />
    );
  }

  if (loading || (!user && token)) {
    return <PortalShellSkeleton collapsed={collapsed} />;
  }

  if (!user) return null;
  const isLawFirm = user.actor === "law_firm";
  if (user.actor !== "staff" && !isLawFirm) return null;

  const canSee = (gate: NavGate) => {
    if (isLawFirm) return gate === "law_firm";
    if (gate === "law_firm") return false;
    if (gate === "admin") return canManageAdmin(user.role);
    if (gate === "finance") return canManageFinance(user.role);
    if (gate === "reviews") return canAccessReviewsQueue(user.role);
    return true;
  };

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSee(item.gate)),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarFooter = (opts: { compact: boolean; onNavigate?: () => void }) => (
    <div className="mt-auto shrink-0 border-t border-white/10 p-3">
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-white/[0.04] p-2.5",
          opts.compact && "px-1.5 py-2",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-1.5 py-1.5",
            opts.compact && "justify-center px-0",
          )}
        >
          <NavLink
            to="/portal/profile"
            onClick={opts.onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 transition",
                isActive ? "bg-white/10" : "hover:bg-white/[0.06]",
                opts.compact && "flex-none justify-center px-0",
              )
            }
            title={t("portal.profile")}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold tracking-wide text-primary ring-1 ring-primary/30">
              {userInitials(user.firstName, user.lastName)}
            </span>
            {!opts.compact ? (
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-white">
                  {user.firstName} {user.lastName}
                </span>
                <span className="block truncate text-[11px] text-white/45">
                  {isLawFirm
                    ? t("despacho.panel.roleBanner")
                    : t(`team.role.${user.role}`, { defaultValue: user.role })}
                </span>
              </span>
            ) : null}
          </NavLink>
          {!opts.compact ? (
            <NavLink
              to="/portal/notifications"
              onClick={opts.onNavigate}
              className="relative shrink-0 rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              title={t("portal.notifications")}
              aria-label={t("portal.notifications")}
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {formatUnread(unreadCount)}
                </span>
              ) : null}
            </NavLink>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-1.5 grid gap-0.5 border-t border-white/10 pt-1.5",
            opts.compact && "grid-cols-1",
          )}
        >
          {opts.compact ? (
            <NavLink
              to="/portal/notifications"
              onClick={opts.onNavigate}
              className="relative flex w-full items-center justify-center rounded-xl px-2.5 py-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
              title={t("portal.notifications")}
              aria-label={t("portal.notifications")}
            >
              <Bell size={15} />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {formatUnread(unreadCount)}
                </span>
              ) : null}
            </NavLink>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-white/50 transition hover:bg-white/[0.06] hover:text-white",
              opts.compact && "justify-center px-1",
            )}
          >
            <LogOut size={15} />
            {!opts.compact ? t("portal.logout") : null}
          </button>
        </div>
      </div>
    </div>
  );

  const sidebarInner = (opts: { compact: boolean; onNavigate?: () => void }) => {
    if (
      !isLawFirm &&
      inCaseContext &&
      (casePublicUuid || isNewCase)
    ) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CasePortalSidebar
            publicUuid={casePublicUuid ?? ""}
            selected={
              casePublicUuid && selected?.publicUuid === casePublicUuid
                ? selected
                : null
            }
            loading={caseSidebarLoading}
            draft={isNewCase}
            viewerRole={user?.role}
            compact={opts.compact}
            onNavigate={opts.onNavigate}
          />
          {sidebarFooter(opts)}
        </div>
      );
    }

    return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-white/10 px-4 py-4",
          opts.compact && "flex-col px-2 py-3",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1",
            opts.compact && "flex w-full justify-center",
          )}
        >
          {opts.compact ? (
            <BrandLogo variant="mark" size="sm" />
          ) : (
            <BrandLogo
              variant="full"
              size="md"
              className="max-h-10 max-w-[11.5rem]"
            />
          )}
        </div>
        <button
          type="button"
          className={cn(
            "hidden rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white lg:inline-flex",
            opts.compact && "mt-1",
          )}
          onClick={() => setCollapsed(!opts.compact)}
          aria-label={
            opts.compact
              ? t("portal.expandSidebar")
              : t("portal.collapseSidebar")
          }
        >
          {opts.compact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!opts.compact && !isLawFirm ? (
        <div className="border-b border-white/10 px-3 py-3">
          <GlobalSearchBar variant="sidebar" />
        </div>
      ) : null}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.id}>
            {!opts.compact ? (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                {t(section.labelKey)}
              </p>
            ) : (
              <div className="mb-2 mx-auto h-px w-6 bg-white/15" aria-hidden />
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ to, end, icon: Icon, labelKey }) => {
                const showBadge =
                  to === "/portal/reviews" &&
                  showReviewsBadge &&
                  pendingReviewsTotal > 0;
                return (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={opts.onNavigate}
                    title={opts.compact ? t(labelKey) : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                        opts.compact && "justify-center px-2",
                        isActive
                          ? "bg-white/[0.09] text-white shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                          : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="relative shrink-0">
                          <Icon
                            size={18}
                            strokeWidth={isActive ? 2.25 : 1.75}
                            className={cn(
                              isActive ? "text-primary" : "text-white/55 group-hover:text-white/80",
                            )}
                          />
                          {opts.compact && showBadge ? (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                              {formatUnread(pendingReviewsTotal)}
                            </span>
                          ) : null}
                        </span>
                        {!opts.compact ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                            {showBadge ? (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                {formatUnread(pendingReviewsTotal)}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {sidebarFooter(opts)}
    </div>
    );
  };

  const useCaseSidebar =
    !isLawFirm && inCaseContext && (casePublicUuid != null || isNewCase);
  const sidebarWidth = useCaseSidebar
    ? 320
    : collapsed
      ? SIDEBAR_COLLAPSED_W
      : SIDEBAR_EXPANDED_W;

  return (
    <div className="min-h-screen overflow-x-clip bg-muted/40">
      <MetaHelmet
        title={t("portal.dashboard")}
        description={t("portal.shellDescription")}
        noindex
      />

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <BrandLogo variant="mark" size="sm" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {!isLawFirm ? (
            <GlobalSearchBar className="max-w-[min(100%,16rem)]" />
          ) : null}
          <button
            type="button"
            className="relative shrink-0 rounded-lg p-2 text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label={
              inCaseContext && !isLawFirm
                ? t("cases.stepTree.openMenu")
                : t("portal.expandSidebar")
            }
          >
            <Menu size={20} />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            ) : null}
          </button>
        </div>
      </header>

      <div className="lg:flex lg:h-svh lg:overflow-hidden">
        <motion.aside
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-y-0 left-0 z-30 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-white/10 bg-delache-950 text-white lg:flex"
        >
          {sidebarInner({ compact: inCaseContext ? false : collapsed })}
        </motion.aside>

        <motion.main
          animate={{ marginLeft: desktopSidebar ? sidebarWidth : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={cn(
            "min-h-svh min-w-0 flex-1 overflow-x-clip overflow-y-auto px-4 sm:px-6 lg:px-8",
            "py-5 lg:py-8",
          )}
        >
          <Outlet />
        </motion.main>

        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.button
                type="button"
                aria-label="Close"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-foreground/40 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 360, damping: 34 }}
                className="fixed inset-y-0 left-0 z-50 flex w-[320px] flex-col overflow-hidden bg-delache-950 text-white lg:hidden"
              >
                <button
                  type="button"
                  className="absolute right-3 top-4 z-10 rounded-lg p-2 text-white/70"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={18} />
                </button>
                {sidebarInner({
                  compact: false,
                  onNavigate: () => setMobileOpen(false),
                })}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function PortalPlaceholder({
  titleKey,
  children,
}: {
  titleKey: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[Manrope] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(titleKey)}
      </h1>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          {t("portal.placeholderBody")}
        </p>
        {children}
      </div>
    </div>
  );
}
