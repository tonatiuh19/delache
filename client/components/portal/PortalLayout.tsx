import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe, logout } from "@/store/slices/authSlice";
import { fetchNotifications } from "@/store/slices/portalSlice";
import {
  canManageAdmin,
  canManageFinance,
} from "@shared/rbac";
import MetaHelmet from "@/components/MetaHelmet";
import AppVersionLabel from "@/components/AppVersionLabel";
import { cn } from "@/lib/utils";
import { PortalShellSkeleton } from "@/components/portal/PortalSkeletons";
import GlobalSearchBar from "@/components/portal/GlobalSearchBar";

const SIDEBAR_COLLAPSED_KEY = "delache_sidebar_collapsed";

const navItems = [
  { to: "/portal", end: true, icon: LayoutDashboard, labelKey: "portal.dashboard", gate: "staff" },
  { to: "/portal/cases", end: false, icon: Briefcase, labelKey: "portal.cases", gate: "staff" },
  { to: "/portal/calendar", end: false, icon: CalendarDays, labelKey: "portal.calendar", gate: "staff" },
  { to: "/portal/documents", end: false, icon: FileText, labelKey: "portal.documents", gate: "staff" },
  { to: "/portal/finance", end: false, icon: Wallet, labelKey: "portal.finance", gate: "finance" },
  { to: "/portal/notifications", end: false, icon: Bell, labelKey: "portal.notifications", gate: "staff" },
  { to: "/portal/team", end: false, icon: Users, labelKey: "portal.team", gate: "admin" },
  { to: "/portal/settings", end: false, icon: Settings, labelKey: "portal.settings", gate: "admin" },
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "justify-center")}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <span className="h-4 w-4 rotate-45 border-[3px] border-current" />
      </span>
      {!compact ? (
        <span className="text-[13px] font-extrabold tracking-[0.28em] text-white">
          DELACHE
        </span>
      ) : null}
    </div>
  );
}

export default function PortalLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, token, loading } = useAppSelector((s) => s.auth);
  const { unreadCount } = useAppSelector((s) => s.portal);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) {
      void dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  useEffect(() => {
    if (!loading && !token) {
      navigate("/portal/login", { replace: true });
    }
  }, [loading, token, navigate]);

  useEffect(() => {
    if (user && user.actor === "law_firm") {
      navigate("/client", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.actor === "staff") {
      void dispatch(fetchNotifications());
    }
  }, [user, dispatch]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/portal/login", { replace: true });
  };

  if (loading || (!user && token)) {
    return <PortalShellSkeleton collapsed={collapsed} />;
  }

  if (!user || user.actor !== "staff") return null;

  const visibleNav = navItems.filter((item) => {
    if (item.gate === "admin") return canManageAdmin(user.role);
    if (item.gate === "finance") return canManageFinance(user.role);
    return true;
  });

  const sidebarInner = (opts: { compact: boolean; onNavigate?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center justify-between px-4 py-5", opts.compact && "px-2")}>
        <BrandMark compact={opts.compact} />
        {!opts.compact ? (
          <button
            type="button"
            className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:inline-flex"
            onClick={() => setCollapsed(true)}
            aria-label={t("portal.collapseSidebar")}
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-sidebar-accent lg:inline-flex"
            onClick={() => setCollapsed(false)}
            aria-label={t("portal.expandSidebar")}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {!opts.compact ? (
        <div className="px-3 pb-3">
          <GlobalSearchBar variant="sidebar" />
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 px-2">
        {visibleNav.map(({ to, end, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={opts.onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                opts.compact && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )
            }
          >
            <span className="relative shrink-0">
              <Icon size={18} />
              {to === "/portal/notifications" && unreadCount > 0 && !opts.compact ? (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
              ) : null}
            </span>
            {!opts.compact ? (
              <span className="flex items-center gap-2">
                {t(labelKey)}
                {to === "/portal/notifications" && unreadCount > 0 ? (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/portal/profile"
          onClick={opts.onNavigate}
          className={({ isActive }) =>
            cn(
              "mb-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-white/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              opts.compact && "justify-center px-2",
            )
          }
          title={t("portal.profile")}
        >
          <UserRound size={16} />
          {!opts.compact ? t("portal.profile") : null}
        </NavLink>
        <div
          className={cn(
            "mb-3 rounded-xl bg-white/5 px-3 py-2",
            opts.compact && "px-2 text-center",
          )}
        >
          {!opts.compact ? (
            <>
              <div className="truncate text-xs font-semibold text-white">
                {user.firstName} {user.lastName}
              </div>
              <div className="truncate text-[10px] text-white/45">
                {user.email}
              </div>
            </>
          ) : (
            <div className="text-[10px] font-bold uppercase text-accent">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/15",
            opts.compact && "justify-center px-2",
          )}
        >
          <LogOut size={16} />
          {!opts.compact ? t("portal.logout") : null}
        </button>
        <div
          className={cn(
            "mt-2 px-3",
            opts.compact && "flex justify-center px-0",
          )}
        >
          <AppVersionLabel className="text-white/35" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <MetaHelmet
        title={t("portal.dashboard")}
        description={t("portal.comingSoonBody")}
        noindex
      />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <BrandMark />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <GlobalSearchBar className="max-w-[min(100%,16rem)]" />
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label={t("portal.expandSidebar")}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 84 : 268 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-[#0b0f1a] text-white lg:block"
        >
          {sidebarInner({ compact: collapsed })}
        </motion.aside>

        {/* Mobile drawer */}
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
                className="fixed inset-y-0 left-0 z-50 w-[292px] bg-[#0b0f1a] text-white lg:hidden"
              >
                <button
                  type="button"
                  className="absolute right-3 top-4 rounded-lg p-2 text-white/70"
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

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
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
          {t("portal.comingSoonBody")}
        </p>
        {children}
      </div>
    </div>
  );
}
