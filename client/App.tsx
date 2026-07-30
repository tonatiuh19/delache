import "./global.css";
import "@/i18n";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { store } from "@/store";
import I18nSync from "@/components/I18nSync";
import Index from "./pages/Index";
import ComingSoon from "./pages/ComingSoon";
import ClientLogin from "./pages/client/Login";
import PortalLogin from "./pages/portal/Login";
import NotFound from "./pages/NotFound";
import PortalLayout from "./components/portal/PortalLayout";
import PortalDashboard from "./pages/portal/Dashboard";
import CasesPage from "./pages/portal/Cases";
import CaseDetailPage from "./pages/portal/CaseDetail";
import CalendarPage from "./pages/portal/Calendar";
import DocumentsPage from "./pages/portal/Documents";
import FinancePage from "./pages/portal/Finance";
import TeamPage from "./pages/portal/Team";
import SettingsPage from "./pages/portal/Settings";
import NotificationsPage from "./pages/portal/Notifications";
import ClientLayout from "./components/client/ClientLayout";
import ClientCasesPage from "./pages/client/Cases";
import ClientCaseDetailPage from "./pages/client/CaseDetail";

const queryClient = new QueryClient();
/** Prod: Coming Soon ON unless explicitly false. Dev: OFF unless explicitly true. */
const comingSoonFlag = import.meta.env.VITE_COMING_SOON;
const comingSoonEnabled = import.meta.env.PROD
  ? comingSoonFlag !== "false"
  : comingSoonFlag === "true";

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
                <Route
                  path="/login"
                  element={<Navigate to="/portal/login" replace />}
                />
                <Route path="/portal/login" element={<PortalLogin />} />
                <Route path="/client/login" element={<ClientLogin />} />
                <Route path="/portal" element={<PortalLayout />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="cases" element={<CasesPage />} />
                  <Route path="cases/:publicUuid" element={<CaseDetailPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="finance" element={<FinancePage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
                <Route path="/client" element={<ClientLayout />}>
                  <Route index element={<ClientCasesPage />} />
                  <Route
                    path="cases/:publicUuid"
                    element={<ClientCaseDetailPage />}
                  />
                </Route>
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
