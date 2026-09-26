import React, { createContext, useContext, useState, useEffect } from "react";

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isSafari: boolean;
  showBanner: boolean;
  showModal: boolean;
  promptInstall: () => Promise<boolean>;
  dismissBanner: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [showBanner, setShowBanner] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const dismissed = sessionStorage.getItem("zuno_pwa_dismissed");
    return !dismissed;
  });
  const [showModal, setShowModal] = useState<boolean>(false);

  // Platform detection
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const isSafari =
    typeof navigator !== "undefined" &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    // Check if already running as standalone app
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
        setShowBanner(false);
      }
    };

    checkStandalone();

    // Listen for BeforeInstallPrompt event (Chrome, Edge, Brave, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem("zuno_pwa_dismissed");
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    // Listen for AppInstalled event
    const handleAppInstalled = () => {
      console.log("🎉 Zuno PWA App was installed successfully!");
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowBanner(false);
      setShowModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setShowBanner(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }

    // Fallback for Safari, iOS, or browsers without native BeforeInstallPrompt
    setShowModal(true);
    return false;
  };

  const dismissBanner = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem("zuno_pwa_dismissed", "true");
    } catch {}
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <PWAContext.Provider
      value={{
        isInstallable: isInstallable || isIOS || isSafari,
        isInstalled,
        isIOS,
        isSafari,
        showBanner: showBanner && !isInstalled,
        showModal,
        promptInstall,
        dismissBanner,
        openModal,
        closeModal,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
