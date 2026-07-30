import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, LogOut, Menu, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMe, logout } from "@/store/slices/authSlice";
import MetaHelmet from "@/components/MetaHelmet";
import AppVersionLabel from "@/components/AppVersionLabel";
import { cn } from "@/lib/utils";

export default function ClientLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, token, loading } = useAppSelector((s) => s.auth);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (token && !user) void dispatch(fetchMe());
  }, [token, user, dispatch]);

  useEffect(() => {
    if (!loading && !token) navigate("/client/login", { replace: true });
  }, [loading, token, navigate]);

  useEffect(() => {
    if (user && user.actor !== "law_firm") {
      navigate("/portal", { replace: true });
    }
  }, [user, navigate]);

  const onLogout = async () => {
    await dispatch(logout());
    navigate("/client/login", { replace: true });
  };

  if (loading || (!user && token)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return null;

  const nav = (onNavigate?: () => void) => (
    <nav className="space-y-1 px-2">
      <NavLink
        to="/client"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )
        }
      >
        <Briefcase size={16} />
        {t("client.cases")}
      </NavLink>
    </nav>
  );

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/40 via-background to-background">
      <MetaHelmet title={t("client.portalTitle")} noindex />
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.28em] text-primary">
                DELACHE
              </div>
              <div className="text-xs text-muted-foreground">
                {t("client.portalTitle")}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
          >
            <LogOut size={14} />
            {t("portal.logout")}
          </button>
        </div>
      </header>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden">
          <div className="h-full w-64 bg-card p-4 shadow-xl">
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {nav(() => setMobileOpen(false))}
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
        <aside className="hidden space-y-4 md:block">
          {nav()}
          <AppVersionLabel />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );

  return shell(<Outlet />);
}
