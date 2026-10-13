import "./global.css";
import "@/i18n";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { store } from "@/store";
import I18nSync from "@/components/I18nSync";
import Index from "./pages/Index";
import ComingSoon from "./pages/ComingSoon";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PortalLayout from "./components/portal/PortalLayout";
import PortalDashboard from "./pages/portal/Dashboard";
import CasesPage from "./pages/portal/Cases";
import CaseDetailLayout from "./pages/portal/CaseDetailLayout";
import CaseDetailOverview from "./pages/portal/CaseDetailOverview";
import CaseNewPage from "./pages/portal/CaseNew";
import CaseDetailPage from "./pages/portal/CaseDetail";
import CalendarPage from "./pages/portal/Calendar";
import DocumentsPage from "./pages/portal/Documents";
import ReviewsPage from "./pages/portal/Reviews";
import FinancePage from "./pages/portal/Finance";
import TeamPage from "./pages/portal/Team";
import FirmTeamPage from "./pages/portal/FirmTeam";
import SettingsPage from "./pages/portal/Settings";
import NotificationsPage from "./pages/portal/Notifications";
import PortalProfilePage from "./pages/portal/Profile";

const queryClient = new QueryClient();
/** Prod: Coming Soon ON unless explicitly false. Dev: OFF unless explicitly true. */
const comingSoonFlag = import.meta.env.VITE_COMING_SOON;
/** Opt-in only. Product is live; set VITE_COMING_SOON=true to show the marketing gate. */
const comingSoonEnabled = comingSoonFlag === "true";

function LegacyClientCaseRedirect() {
  const { publicUuid } = useParams();
  return <Navigate to={`/portal/cases/${publicUuid ?? ""}`} replace />;
}

const App = () => (
  <HelmetProvider>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <I18nSync />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {comingSoonEnabled ? (
              <ComingSoon />
            ) : (
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/portal/login"
                  element={<Navigate to="/login" replace />}
                />
                <Route
                  path="/client/login"
                  element={<Navigate to="/login" replace />}
                />
                <Route path="/portal" element={<PortalLayout />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="cases" element={<CasesPage />} />
                  <Route path="cases/new" element={<CaseNewPage />} />
                  <Route path="cases/:publicUuid" element={<CaseDetailLayout />}>
                    <Route index element={<CaseDetailOverview />} />
                    <Route path="p/:stepSlug" element={<CaseDetailPage />} />
                  </Route>
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="finance" element={<FinancePage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="firm-team" element={<FirmTeamPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<PortalProfilePage />} />
                </Route>
                {/* Legacy despacho paths → portal */}
                <Route
                  path="/client"
                  element={<Navigate to="/portal/cases" replace />}
                />
                <Route
                  path="/client/cases/new"
                  element={<Navigate to="/portal/cases/new" replace />}
                />
                <Route
                  path="/client/cases/:publicUuid"
                  element={<LegacyClientCaseRedirect />}
                />
                <Route
                  path="/client/notifications"
                  element={<Navigate to="/portal/notifications" replace />}
                />
                <Route
                  path="/client/profile"
                  element={<Navigate to="/portal/profile" replace />}
                />
                <Route path="/app" element={<Navigate to="/portal" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  </HelmetProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
