import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "../types";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import { getOrInitializeKeyPair } from "../crypto/keyPair";
import { clearDerivedKeyCache } from "../crypto/keyExchange";
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  isTokenExpired,
  getTokenTimeRemainingMs,
} from "../utils/token";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  e2eeKeyPair: CryptoKeyPair | null;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, chatId: string, email: string, password: string) => Promise<{ emailSent?: boolean; message: string }>;
  verifyEmail: (token: string) => Promise<{ user: any; message: string }>;
  resendVerification: (email: string) => Promise<{ message: string; emailSent?: boolean }>;
  clearPendingVerification: () => void;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  setAvatarPreset: (avatar: string) => Promise<string>;
  updateName: (name: string) => Promise<string>;
  deactivateAccount: () => Promise<void>;
  logout: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const stored = getStoredToken();
    return isTokenExpired(stored) ? null : stored;
  });
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [e2eeKeyPair, setE2eeKeyPair] = useState<CryptoKeyPair | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingVerificationEmail, setPendingVerificationEmailState] = useState<string | null>(() => {
    return localStorage.getItem("zuno_pending_email");
  });

  const clearSessionMessage = useCallback(() => {
    setSessionMessage(null);
  }, []);

  const setPendingVerificationEmail = (email: string | null) => {
    if (email) {
      localStorage.setItem("zuno_pending_email", email);
    } else {
      localStorage.removeItem("zuno_pending_email");
    }
    setPendingVerificationEmailState(email);
  };

  const logout = useCallback((reason?: unknown) => {
    removeStoredToken();
    setUser(null);
    setToken(null);
    setE2eeKeyPair(null);
    setPendingVerificationEmail(null);
    clearDerivedKeyCache();
    socketService.disconnect();
    if (typeof reason === "string") {
      setSessionMessage(reason);
    }
  }, []);

  const initKeys = async (currentUser: User) => {
    try {
      const { keyPair, publicKeyJwk, isNew } = await getOrInitializeKeyPair(currentUser.id);
      setE2eeKeyPair(keyPair);

      // If key is freshly generated or server has no record of it, upload public key to server
      if (isNew || !currentUser.publicKey || currentUser.publicKey !== publicKeyJwk) {
        await api.users.updatePublicKey(publicKeyJwk);
        currentUser.publicKey = publicKeyJwk;
      }
    } catch (cryptoErr) {
      console.error("Failed to initialize E2EE keys:", cryptoErr);
    }
  };

  // Initial user loading & session validation on mount
  useEffect(() => {
    async function loadUser() {
      const storedToken = getStoredToken();
      if (!storedToken || isTokenExpired(storedToken)) {
        removeStoredToken();
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const data = await api.auth.getMe();
        setUser(data.user);
        setToken(storedToken);
        // Connect Socket.IO on valid user session
        socketService.connect(storedToken);

        // Initialize E2EE key pair
        await initKeys(data.user);
      } catch (err) {
        console.warn("Session expired or invalid on startup:", err);
        logout("Your session has expired. Please sign in again.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [logout]);

  // Session Watchdog: Proactively detects token expiry, token deletion, cross-tab logouts, and 401 events
  useEffect(() => {
    if (!user) return;

    const checkSessionHealth = () => {
      const activeToken = getStoredToken();
      if (!activeToken) {
        logout("Your login token was deleted. Please sign in again.");
        return;
      }
      if (isTokenExpired(activeToken)) {
        logout("Your session has expired. Please sign in again.");
        return;
      }
    };

    // 1. Cross-tab storage change listener (triggers when token is deleted in DevTools or another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" || e.key === "token") {
        if (!e.newValue) {
          logout("Your login token was deleted. Please sign in again.");
        }
      }
    };

    // 2. Global unauthorized listener (from 401 HTTP response or socket auth error)
    const handleUnauthorized = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      logout(customEvent.detail?.message || "Session expired. Please sign in again.");
    };

    // 3. Proactive timer for token expiry
    const activeToken = getStoredToken();
    let expiryTimer: any = null;
    if (activeToken) {
      const remainingMs = getTokenTimeRemainingMs(activeToken);
      if (remainingMs <= 0) {
        logout("Your session has expired. Please sign in again.");
        return;
      }
      if (remainingMs < 2147483647) {
        expiryTimer = setTimeout(() => {
          logout("Your session has expired. Please sign in again.");
        }, remainingMs);
      }
    }

    // 4. Periodic polling watchdog (every 1.5 seconds) + window focus check for same-tab console deletion
    const interval = setInterval(checkSessionHealth, 1500);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", checkSessionHealth);
    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", checkSessionHealth);
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [user, logout]);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    const jwtToken = data.accessToken || data.token;
    setStoredToken(jwtToken);
    setUser(data.user);
    setToken(jwtToken);
    setSessionMessage(null);
    setPendingVerificationEmail(null);
    socketService.connect(jwtToken);

    // Initialize E2EE key pair
    await initKeys(data.user);
  };

  const register = async (name: string, chatId: string, email: string, password: string) => {
    const data = await api.auth.register({ name, chatId, email, password });
    const jwtToken = data.accessToken || data.token;
    if (jwtToken) {
      setStoredToken(jwtToken);
      setUser(data.user);
      setToken(jwtToken);
      setSessionMessage(null);
      setPendingVerificationEmail(null);
      socketService.connect(jwtToken);
      await initKeys(data.user);
    } else if (data.requiresVerification) {
      setPendingVerificationEmail(email);
    }
    return data;
  };

  const verifyEmailAction = async (verificationToken: string) => {
    const data = await api.auth.verifyEmail(verificationToken);
    const jwtToken = data.accessToken || data.token;
    setStoredToken(jwtToken);
    setUser(data.user);
    setToken(jwtToken);
    setSessionMessage(null);
    setPendingVerificationEmail(null);
    socketService.connect(jwtToken);
    await initKeys(data.user);
    return data;
  };

  const resendVerification = async (email: string) => {
    return await api.auth.resendVerification(email);
  };

  const clearPendingVerification = () => {
    setPendingVerificationEmail(null);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const data = await api.users.uploadAvatar(file);
    if (data?.avatar) {
      setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
      return data.avatar;
    }
    throw new Error("Failed to upload avatar");
  };

  const removeAvatar = async (): Promise<void> => {
    await api.users.removeAvatar();
    setUser((prev) => (prev ? { ...prev, avatar: null } : null));
  };

  const setAvatarPreset = async (avatar: string): Promise<string> => {
    const data = await api.users.setAvatarPreset(avatar);
    if (data?.avatar !== undefined) {
      setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
      return data.avatar;
    }
    throw new Error("Failed to set avatar preset");
  };

  const updateName = async (name: string): Promise<string> => {
    const data = await api.users.updateName(name);
    if (data?.user) {
      setUser((prev) => (prev ? { ...prev, name: data.user.name } : null));
    }
    return data.message || "Name updated successfully";
  };

  const deactivateAccount = async (): Promise<void> => {
    await api.users.deactivateAccount();
    logout("Your account has been deactivated successfully. You can sign in anytime to reactivate.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        sessionMessage,
        clearSessionMessage,
        e2eeKeyPair,
        pendingVerificationEmail,
        setPendingVerificationEmail,
        login,
        register,
        verifyEmail: verifyEmailAction,
        resendVerification,
        clearPendingVerification,
        uploadAvatar,
        removeAvatar,
        setAvatarPreset,
        updateName,
        deactivateAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
