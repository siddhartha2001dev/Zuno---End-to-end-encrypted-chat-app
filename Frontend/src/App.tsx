import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PWAProvider } from "./context/PWAContext";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { NewChatModal } from "./components/NewChatModal";
import { VerifyEmailView } from "./components/VerifyEmailView";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { InstallAppBanner } from "./components/InstallAppBanner";

const MainLayout: React.FC = () => {
  const { clearPendingVerification } = useAuth();
  const [isNewChatOpen, setIsNewChatOpen] = useState<boolean>(false);

  // Check URL parameters for email verification token
  const [verifyToken, setVerifyToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const path = window.location.pathname;
    if (token) return token;
    if (path === "/verify-email") {
      window.history.replaceState({}, document.title, "/");
    }
    return null;
  });

  const [initialEmail, setInitialEmail] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Verification Screen: If a verification token exists, render dedicated Account Verified view
  if (verifyToken) {
    return (
      <VerifyEmailView
        token={verifyToken}
        onComplete={(verifiedEmail) => {
          // Remove query params from address bar and reset route
          window.history.replaceState({}, document.title, "/");
          setVerifyToken(null);
          clearPendingVerification();
          if (verifiedEmail) {
            setInitialEmail(verifiedEmail);
            setSuccessBanner("Email verified successfully! Welcome to Zuno.");
          }
        }}
      />
    );
  }

  // Protected Chat Route: Wraps the chat interface inside <ProtectedRoute>
  // Anyone without valid login credentials is automatically stopped and shown AuthModal
  return (
    <ProtectedRoute
      initialEmail={initialEmail}
      successBanner={successBanner}
    >
      <ChatProvider>
        <div className="h-full w-full flex bg-theme-bg text-theme-text overflow-hidden relative">
          <Sidebar onOpenNewChat={() => setIsNewChatOpen(true)} />
          <ChatArea onOpenNewChat={() => setIsNewChatOpen(true)} />
          <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
        </div>
      </ChatProvider>
    </ProtectedRoute>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <PWAProvider>
        <AuthProvider>
          <div className="flex flex-col h-screen w-screen overflow-hidden bg-theme-bg text-theme-text">
            <InstallAppBanner />
            <div className="flex-1 overflow-hidden relative h-full w-full">
              <MainLayout />
            </div>
          </div>
        </AuthProvider>
      </PWAProvider>
    </ThemeProvider>
  );
}

