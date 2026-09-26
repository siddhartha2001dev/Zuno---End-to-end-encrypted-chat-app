import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";
import { Loader2 } from "lucide-react";
import { getStoredToken, isTokenExpired } from "../utils/token";

interface ProtectedRouteProps {
  children: React.ReactNode;
  initialEmail?: string;
  successBanner?: string | null;
}

/**
 * ProtectedRoute Component:
 * Strict security route guard that prevents unauthenticated access to the chat interface.
 *
 * Verifies:
 * 1. Active user in context (user != null)
 * 2. Active token present in LocalStorage (token != null)
 * 3. JWT token validity (exp > now, not expired)
 *
 * If any check fails, or if token is deleted or expired, it automatically:
 * - Logs out the user and clears all cached cryptographic & session data
 * - Displays AuthModal (Login/Signup) with an informative alert banner
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  initialEmail,
  successBanner,
}) => {
  const { user, loading, sessionMessage, logout } = useAuth();

  // Active validation on render / mount
  useEffect(() => {
    if (!loading && user) {
      const storedToken = getStoredToken();
      if (!storedToken) {
        logout("Your login token was deleted from storage. Please sign in again.");
      } else if (isTokenExpired(storedToken)) {
        logout("Your session has expired. Please sign in again.");
      }
    }
  }, [loading, user, logout]);

  // Loading state while checking session
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text gap-3 select-none">
        <Loader2 className="w-6 h-6 animate-spin text-theme-accent" />
        <span className="text-xs font-medium text-theme-text-secondary">Connecting to Zuno...</span>
      </div>
    );
  }

  const storedToken = getStoredToken();
  const isAuthorized = Boolean(user && storedToken && !isTokenExpired(storedToken));

  // If not authenticated or token is missing/expired, block route and render Login page
  if (!isAuthorized) {
    return (
      <AuthModal
        initialEmail={initialEmail}
        successBanner={sessionMessage || successBanner || undefined}
      />
    );
  }

  // Fully authenticated and validated: Render protected chat application
  return <>{children}</>;
};
