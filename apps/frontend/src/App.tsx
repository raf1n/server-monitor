import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  useIsAuthenticated,
  useAuthLoading,
  useLogin,
  useInitAuth,
} from "@/store";
import { LoginPage } from "@/components/auth/login-page";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();
  const login = useLogin();
  const initAuth = useInitAuth();
  const isLive = API_HOST !== undefined;

  useEffect(() => {
    if (isLive) initAuth();
  }, [isLive, initAuth]);

  if (isLive && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLive && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage onLogin={login} />;
}
