import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { ZunoLogo } from "./ZunoLogo";

interface VerifyEmailViewProps {
  token: string;
  onComplete: (verifiedEmail?: string) => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  token,
  onComplete,
}) => {
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [verifiedUser, setVerifiedUser] = useState<{
    name: string;
    email: string;
    chatId: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(2);

  const hasVerified = useRef<boolean>(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    async function verify() {
      try {
        const data = await verifyEmail(token);
        setVerifiedUser(data.user);
        setStatus("success");
      } catch (err: any) {
        console.error("Verification error:", err);
        setErrorMessage(
          err.message || "Invalid or expired verification link."
        );
        setStatus("error");
      }
    }

    verify();
  }, [token, verifyEmail]);

  // Handle auto-proceed into chat on successful verification
  useEffect(() => {
    if (status !== "success") return;

    if (countdown <= 0) {
      onComplete(verifiedUser?.email);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown, onComplete, verifiedUser?.email]);

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-theme-bg p-4 sm:p-6 text-theme-text select-none relative overflow-hidden">
      {/* Ambient liquid glow background */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full liquid-orb-emerald pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] rounded-full liquid-orb-mint pointer-events-none" />

      <div className="w-full max-w-sm liquid-glass-elevated border border-emerald-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-200">
        
        {/* Header Logo */}
        <div className="flex justify-center mb-6">
          <ZunoLogo size="sm" showWordmark={true} />
        </div>

        {/* ── Status 1: Verifying ── */}
        {status === "verifying" && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-theme-text mb-1">
              Verifying Email...
            </h2>
            <p className="text-xs text-theme-text-muted">
              Confirming your security token with Zuno
            </p>
          </div>
        )}

        {/* ── Status 2: Success (Email Verified & Entering Chat) ── */}
        {status === "success" && (
          <div className="py-2 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in-75 duration-300" />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-theme-text mb-1">
              Email Verified!
            </h1>
            <p className="text-xs text-theme-text-secondary mb-5">
              Welcome to Zuno, <strong className="text-emerald-500">{verifiedUser?.name || "Friend"}</strong>! Entering your chat...
            </p>

            <button
              type="button"
              onClick={() => onComplete(verifiedUser?.email)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_2px_10px_-2px_rgba(16,185,129,0.35)] active:scale-98"
            >
              <span>Enter Chat Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Status 3: Error ── */}
        {status === "error" && (
          <div className="py-2 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-theme-text mb-2">
              Verification Failed
            </h2>
            <p className="text-xs text-red-500 dark:text-red-400 leading-relaxed mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20 max-w-xs">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => onComplete()}
              className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold underline transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
