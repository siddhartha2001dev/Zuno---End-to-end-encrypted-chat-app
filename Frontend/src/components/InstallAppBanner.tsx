import React from "react";
import { usePWA } from "../context/PWAContext";
import {
  Download,
  X,
  Share,
  PlusSquare,
  ExternalLink,
} from "lucide-react";

export const InstallAppBanner: React.FC = () => {
  const {
    showBanner,
    showModal,
    isInstalled,
    isIOS,
    isSafari,
    promptInstall,
    dismissBanner,
    closeModal,
  } = usePWA();

  // If already installed, don't show banner
  if (isInstalled) return null;

  return (
    <>
      {/* ── Desktop & Mobile Install Prompt Banner ── */}
      {showBanner && (
        <div
          className="w-full bg-theme-surface border-b border-theme-border px-4 py-2 text-theme-text flex items-center justify-between gap-3 shadow-subtle z-50 animate-in slide-in-from-top duration-200"
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* App Icon */}
            <img
              src="/zuno-favicon.ico"
              alt="Zuno"
              className="w-6 h-6 rounded-md object-contain flex-shrink-0"
            />

            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-medium tracking-tight text-theme-text truncate block">
                Install Zuno App
              </span>
              <p className="text-[11px] text-theme-text-muted truncate hidden xs:block">
                Add to your device for fast access and notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={promptInstall}
              className="py-1 px-3 rounded-lg bg-theme-accent hover:opacity-90 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-subtle cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              onClick={dismissBanner}
              title="Dismiss"
              aria-label="Dismiss banner"
              className="p-1 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Instruction Modal for Safari / Manual Install ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 max-w-md w-full shadow-modal relative text-theme-text">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-theme-text-muted hover:text-theme-text p-1 rounded-lg hover:bg-theme-bg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/zuno-favicon.ico"
                alt="Zuno"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <div>
                <h3 className="text-sm font-semibold text-theme-text">Install Zuno</h3>
                <p className="text-xs text-theme-text-muted">Add to your device</p>
              </div>
            </div>

            <div className="space-y-2.5 my-5 text-xs text-theme-text-secondary">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                    <Share className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-theme-text">1. Tap Share</p>
                      <p className="text-theme-text-muted">In Safari, tap the share icon at the bottom.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                    <PlusSquare className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-theme-text">2. Add to Home Screen</p>
                      <p className="text-theme-text-muted">Tap &apos;Add to Home Screen&apos;.</p>
                    </div>
                  </div>
                </>
              ) : isSafari ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                    <ExternalLink className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-theme-text">1. File menu</p>
                      <p className="text-theme-text-muted">Click &apos;File&apos; in your Mac menu bar.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                    <PlusSquare className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-theme-text">2. Add to Dock</p>
                      <p className="text-theme-text-muted">Select &apos;Add to Dock...&apos; to install.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                  <Download className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-theme-text">Install via Browser</p>
                    <p className="text-theme-text-muted">Click the install icon in your address bar or browser menu ➔ &apos;Install Zuno&apos;.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={closeModal}
              className="w-full py-2 rounded-lg bg-theme-accent hover:opacity-90 text-white font-medium text-xs transition-colors shadow-subtle cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
