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
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-2xl p-8 sm:p-10 shadow-modal relative z-10 text-center">
        
        {/* Header Logo */}
        <div className="flex justify-center mb-6">
          <ZunoLogo size="sm" showWordmark={true} />
        </div>

        {/* ── Status 1: Verifying ── */}
        {status === "verifying" && (
          <div className="py-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center mb-4 text-theme-accent">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-theme-text mb-1">
              Verifying Email...
            </h2>
            <p className="text-xs text-theme-text-muted">
              Confirming your security token with Zuno
            </p>
          </div>
        )}

        {/* ── Status 2: Success (Email Verified & Entering Chat) ── */}
        {status === "success" && (
          <div className="py-2 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-500">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-theme-text mb-1">
              Email Verified!
            </h1>
            <p className="text-xs text-theme-text-secondary mb-5">
              Welcome to Zuno, <strong className="text-theme-text font-medium">{verifiedUser?.name || "Friend"}</strong>! Entering your chat...
            </p>

            <button
              type="button"
              onClick={() => onComplete(verifiedUser?.email)}
              className="w-full py-2.5 px-4 rounded-xl bg-theme-accent hover:opacity-90 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-subtle cursor-pointer"
            >
              <span>Enter Chat Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Status 3: Error ── */}
        {status === "error" && (
          <div className="py-2 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
              <XCircle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-semibold tracking-tight text-theme-text mb-2">
              Verification Failed
            </h2>
            <p className="text-xs text-red-500 leading-relaxed mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20 max-w-xs">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => onComplete()}
              className="text-xs text-theme-accent hover:underline font-medium transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
