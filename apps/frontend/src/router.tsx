import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import App from "./App";
import DashboardLayout from "./layouts/dashboard-layout";

const DashboardHome = lazy(() =>
  import("./pages/dashboard-home").then((m) => ({ default: m.DashboardHome })),
);
const ServersPage = lazy(() =>
  import("./components/dashboard/pages/servers-page").then((m) => ({ default: m.ServersPage })),
);
const ProcessesPage = lazy(() =>
  import("./components/dashboard/pages/processes-page").then((m) => ({ default: m.ProcessesPage })),
);
const AlertsPage = lazy(() =>
  import("./components/dashboard/pages/alerts-page").then((m) => ({ default: m.AlertsPage })),
);
const SettingsPage = lazy(() =>
  import("./components/dashboard/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
);
const ProfilePage = lazy(() =>
  import("./components/dashboard/pages/profile-page").then((m) => ({ default: m.ProfilePage })),
);
const ApiKeysPage = lazy(() =>
  import("./components/dashboard/pages/api-keys-page").then((m) => ({ default: m.ApiKeysPage })),
);
const PortsPage = lazy(() =>
  import("./components/dashboard/pages/ports-page").then((m) => ({ default: m.PortsPage })),
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <App />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <DashboardHome />
          </SuspenseWrapper>
        ),
      },
      {
        path: "servers",
        element: (
          <SuspenseWrapper>
            <ServersPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "processes",
        element: (
          <SuspenseWrapper>
            <ProcessesPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "alerts",
        element: (
          <SuspenseWrapper>
            <AlertsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "profile",
        element: (
          <SuspenseWrapper>
            <ProfilePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "api-keys",
        element: (
          <SuspenseWrapper>
            <ApiKeysPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "ports",
        element: (
          <SuspenseWrapper>
            <PortsPage />
          </SuspenseWrapper>
        ),
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
