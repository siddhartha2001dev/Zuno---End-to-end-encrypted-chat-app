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
          className="w-full bg-[#111615]/85 dark:bg-[#0f1513]/90 border-b border-emerald-500/20 backdrop-blur-xl px-4 py-2 text-white flex items-center justify-between gap-3 shadow-lg z-50 animate-in slide-in-from-top duration-300"
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* App Icon */}
            <img
              src="/zuno-favicon.ico"
              alt="Zuno"
              className="w-7 h-7 rounded-lg object-contain flex-shrink-0"
            />

            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-white truncate block">
                Install Zuno App
              </span>
              <p className="text-[11px] text-slate-300 truncate hidden xs:block">
                Add to your device for fast access and notifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={promptInstall}
              className="py-1 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(16,185,129,0.35)] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              onClick={dismissBanner}
              title="Dismiss"
              aria-label="Dismiss banner"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Instruction Modal for Safari / Manual Install ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="liquid-glass-elevated border border-emerald-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-theme-text">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-theme-text-muted hover:text-theme-text p-1 rounded-lg hover:bg-theme-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/zuno-favicon.ico"
                alt="Zuno"
                className="w-9 h-9 rounded-xl object-contain"
              />
              <div>
                <h3 className="text-sm font-bold text-theme-text">Install Zuno</h3>
                <p className="text-xs text-theme-text-muted">Add to your device</p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs text-theme-text-secondary">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                    <Share className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-theme-text">1. Tap Share</p>
                      <p className="text-theme-text-muted">In Safari, tap the share icon at the bottom.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                    <PlusSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-theme-text">2. Add to Home Screen</p>
                      <p className="text-theme-text-muted">Tap &apos;Add to Home Screen&apos;.</p>
                    </div>
                  </div>
                </>
              ) : isSafari ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                    <ExternalLink className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-theme-text">1. File menu</p>
                      <p className="text-theme-text-muted">Click &apos;File&apos; in your Mac menu bar.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                    <PlusSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-theme-text">2. Add to Dock</p>
                      <p className="text-theme-text-muted">Select &apos;Add to Dock...&apos; to install.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                  <Download className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-theme-text">Install via Browser</p>
                    <p className="text-theme-text-muted">Click the install icon in your address bar or browser menu ➔ &apos;Install Zuno&apos;.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={closeModal}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-[0_2px_10px_-2px_rgba(16,185,129,0.35)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
