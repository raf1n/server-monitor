import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store";
import { useGetMeQuery, useLoginMutation } from "@/features/auth/authApi";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/features/auth/authSelectors";
import { LoginPage } from "@/components/auth/login-page";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export default function App() {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authLoading = useAppSelector(selectAuthLoading);
  const [login] = useLoginMutation();
  const isLive = API_HOST !== undefined;

  useGetMeQuery();

  const handleLogin = async (username: string, password: string) => {
    await login({ username, password }).unwrap();
  };

  if (isLive && authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLive && (isAuthenticated || !!user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage onLogin={handleLogin} />;
}
