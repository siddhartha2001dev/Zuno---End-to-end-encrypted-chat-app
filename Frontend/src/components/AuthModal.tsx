import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  ArrowLeft,
  AtSign,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { ZunoLogo } from "./ZunoLogo";
import { ThemeToggle } from "./ThemeToggle";
import { usePWA } from "../context/PWAContext";

interface AuthModalProps {
  initialEmail?: string;
  successBanner?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialEmail, successBanner }) => {
  const { isInstalled, promptInstall } = usePWA();
  const {
    login,
    register,
    resendVerification,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    clearPendingVerification,
  } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [chatIdStatus, setChatIdStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [chatIdMessage, setChatIdMessage] = useState<string>("");
  const [email, setEmail] = useState<string>(() => initialEmail || "");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Debounced Chat ID availability check
  // Debounced Chat ID availability check
  React.useEffect(() => {
    if (isLogin) {
      setChatIdStatus("idle");
      setChatIdMessage("");
      return;
    }

    const clean = chatId.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setChatIdStatus("idle");
      setChatIdMessage("");
      return;
    }

    if (clean.length < 3) {
      setChatIdStatus("invalid");
      setChatIdMessage("Must be at least 3 characters");
      return;
    }

    const validFormat = /^[a-z0-9][a-z0-9._]{2,29}$/.test(clean);
    if (!validFormat) {
      setChatIdStatus("invalid");
      setChatIdMessage("Letters, numbers, dots, or underscores only (3-30 chars)");
      return;
    }

    setChatIdStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await api.users.checkChatId(clean);
        setChatIdStatus(result.available ? "available" : "taken");
        setChatIdMessage(result.message);
      } catch {
        setChatIdStatus("idle");
        setChatIdMessage("Checking availability on submit");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [chatId, isLogin]);

  React.useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setIsLogin(true);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setSubmitting(false);
          return;
        }

        const cleanChatId = chatId.trim().toLowerCase().replace(/^@/, "");
        if (!cleanChatId || cleanChatId.length < 3) {
          setError("Chat ID must be at least 3 characters long");
          setSubmitting(false);
          return;
        }

        const validFormat = /^[a-z0-9][a-z0-9._]{2,29}$/.test(cleanChatId);
        if (!validFormat) {
          setError("Chat ID must start with a letter or number and contain only lowercase letters, numbers, dots, or underscores (3-30 chars)");
          setSubmitting(false);
          return;
        }

        if (chatIdStatus === "taken") {
          setError("This Chat ID is already taken. Please choose another one.");
          setSubmitting(false);
          return;
        }

        // If not already verified available (e.g. user clicked submit quickly before debounce finished)
        if (chatIdStatus !== "available") {
          try {
            const check = await api.users.checkChatId(cleanChatId);
            if (!check.available) {
              setChatIdStatus("taken");
              setChatIdMessage(check.message || "This Chat ID is already taken");
              setError("This Chat ID is already taken. Please choose a different one.");
              setSubmitting(false);
              return;
            }
            setChatIdStatus("available");
          } catch (e) {
            // Don't block registration on network check glitch, backend register will validate!
            console.warn("Could not pre-verify Chat ID, backend will validate:", e);
          }
        }

        await register(name.trim(), cleanChatId, email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingVerificationEmail || resending) return;
    setResendSuccess(null);
    setError(null);
    setResending(true);

    try {
      const result = await resendVerification(pendingVerificationEmail);
      setResendSuccess(result.message || "Verification email sent successfully! Please check your inbox.");

      // Start 60s cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ───────────────────────────────────────────
  // Shared Top Navigation Bar (Logo + ThemeToggle + PWA)
  // ───────────────────────────────────────────
  const renderNavbar = () => (
    <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-20 relative">
      <div className="flex items-center gap-2">
        <ZunoLogo size="sm" showWordmark={true} />
      </div>
      <div className="flex items-center gap-2">
        {!isInstalled && (
          <button
            onClick={promptInstall}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-all active:scale-95 shadow-xs"
          >
            <img src="/zuno-favicon.ico" alt="" className="w-3.5 h-3.5 object-contain" />
            <span>Install App</span>
          </button>
        )}
        <ThemeToggle className="bg-theme-surface/80 border border-theme-border rounded-full hover:scale-105 transition-all shadow-xs" />
      </div>
    </header>
  );

  // ───────────────────────────────────────────
  // Email Verification Pending Screen
  // ───────────────────────────────────────────
  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen w-screen flex flex-col bg-theme-bg text-theme-text select-none overflow-x-hidden relative">
        {/* Ambient Liquid Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full liquid-orb-emerald pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full liquid-orb-mint pointer-events-none" />

        {/* Top Navbar */}
        {renderNavbar()}

        {/* Centered Floating Verification Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
          <div className="w-full max-w-md liquid-glass-elevated border border-emerald-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Animated Mail Icon */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(16,185,129,0.3)]">
                  <MailCheck className="w-9 h-9 text-emerald-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md animate-bounce">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text mb-1.5">
                Check your email
              </h2>
              <p className="text-xs sm:text-sm text-theme-text-secondary leading-relaxed">
                We've sent a verification link to
              </p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 break-all">
                {pendingVerificationEmail}
              </p>
            </div>

            {/* Step Instructions */}
            <div className="space-y-2.5 mb-5 text-left">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  1
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  Open the verification email sent by <strong className="text-theme-text font-semibold">Zuno Chat</strong>
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  2
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  Click <strong className="text-theme-text font-semibold">"Verify My Email"</strong> link inside
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface/70 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  You'll be <strong className="text-theme-text font-semibold">automatically logged in</strong> to your chats
                </p>
              </div>
            </div>

            {/* Error / Success Alerts */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {resendSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}


            {/* Resend Email Button */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="w-full py-2.5 px-4 rounded-xl bg-theme-surface/80 hover:bg-theme-surface border border-theme-border text-theme-text font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Sending email...</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${resendCooldown > 0 ? "" : "group-hover:rotate-180 transition-transform"}`} />
                  <span>{resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend Verification Email"}</span>
                </>
              )}
            </button>

            {/* Back to Sign In */}
            <div className="mt-5 pt-4 border-t border-theme-border/60 text-center">
              <button
                type="button"
                onClick={() => {
                  clearPendingVerification();
                  setIsLogin(true);
                  setError(null);
                  setResendSuccess(null);
                }}
                className="text-xs text-theme-text-muted hover:text-emerald-500 font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ───────────────────────────────────────────
  // Main Authentication Portal (Login / Register)
  // ───────────────────────────────────────────
  return (
    <div className="min-h-screen w-screen flex flex-col bg-theme-bg text-theme-text select-none overflow-x-hidden relative">
      {/* Ambient Liquid Glow Orbs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full liquid-orb-emerald pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] rounded-full liquid-orb-mint pointer-events-none" />

      {/* Top Navbar */}
      {renderNavbar()}

      {/* Centered Modern Chat App Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[440px] liquid-glass-elevated border border-emerald-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl relative transition-all duration-200">
          
          {/* Brand Icon Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 p-2.5 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(16,185,129,0.25)]">
                <img src="/zuno-favicon.ico" alt="Zuno" className="w-10 h-10 object-contain" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-theme-bg flex items-center justify-center shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text">
              {isLogin ? "Sign in to Zuno" : "Create your account"}
            </h1>
            <p className="text-xs sm:text-sm text-theme-text-secondary mt-1.5 leading-relaxed max-w-xs">
              {isLogin
                ? "Welcome back! Enter your details to continue."
                : "Connect with friends and start chatting securely."}
            </p>
          </div>

          {/* Banner Alert (Session expiry, Token deletion, or Account verification) */}
          {successBanner && !error && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
                successBanner.toLowerCase().includes("expired") ||
                successBanner.toLowerCase().includes("deleted") ||
                successBanner.toLowerCase().includes("ended")
                  ? "bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {successBanner.toLowerCase().includes("expired") ||
              successBanner.toLowerCase().includes("deleted") ||
              successBanner.toLowerCase().includes("ended") ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              )}
              <span>{successBanner}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
              {error.toLowerCase().includes("verif") && email && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await resendVerification(email.trim());
                      setPendingVerificationEmail(email.trim());
                    } catch (resendErr: any) {
                      setError(resendErr.message || "Failed to resend verification email");
                    }
                  }}
                  className="mt-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 underline block cursor-pointer"
                >
                  Resend verification email to {email}
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <>
                {/* Full Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-theme-text-secondary"
                  >
                    Full Name
                  </label>
                  <div className="group relative flex items-center h-11 sm:h-12 w-full rounded-xl bg-white dark:bg-[#151d1b] border border-theme-border hover:border-emerald-500/50 dark:border-white/10 dark:hover:border-emerald-500/40 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:focus-within:ring-emerald-500/20 focus-within:hover:border-emerald-500 shadow-xs transition-all duration-150">
                    <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      disabled={submitting}
                      className="w-full h-full bg-transparent pl-10 pr-3.5 text-base sm:text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                    />
                  </div>
                </div>

                {/* Chat ID Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="chatId"
                      className="block text-xs font-semibold text-theme-text-secondary"
                    >
                      Chat ID
                    </label>
                    <span className="text-[11px] text-theme-text-muted">unique @username</span>
                  </div>
                  <div className={`group relative flex items-center h-11 sm:h-12 w-full rounded-xl bg-white dark:bg-[#151d1b] border shadow-xs transition-all duration-150 ${
                    chatIdStatus === "available"
                      ? "border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/15"
                      : chatIdStatus === "taken" || chatIdStatus === "invalid"
                      ? "border-red-400 dark:border-red-500 ring-2 ring-red-500/15"
                      : "border-theme-border hover:border-emerald-500/50 dark:border-white/10 dark:hover:border-emerald-500/40 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:focus-within:ring-emerald-500/20"
                  }`}>
                    <span className={`pointer-events-none absolute left-3.5 flex items-center justify-center transition-colors ${
                      chatIdStatus === "available"
                        ? "text-emerald-500"
                        : chatIdStatus === "taken" || chatIdStatus === "invalid"
                        ? "text-red-500"
                        : "text-theme-text-muted group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400"
                    }`}>
                      <AtSign className="w-4 h-4" />
                    </span>
                    <input
                      id="chatId"
                      name="chatId"
                      type="text"
                      required={!isLogin}
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                      placeholder="username (e.g. alex)"
                      autoComplete="username"
                      disabled={submitting}
                      className="w-full h-full bg-transparent pl-10 pr-10 text-base sm:text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                    />
                    {/* Status indicator */}
                    <span className="absolute right-3.5 flex items-center justify-center">
                      {chatIdStatus === "checking" && (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      )}
                      {chatIdStatus === "available" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {(chatIdStatus === "taken" || chatIdStatus === "invalid") && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </span>
                  </div>
                  {/* Status message */}
                  {chatIdMessage && chatIdStatus !== "idle" && (
                    <p className={`text-[11px] font-medium mt-1 ${
                      chatIdStatus === "available"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}>
                      {chatIdMessage}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email Address Field */}
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-theme-text-secondary"
              >
                Email Address
              </label>
              <div className="group relative flex items-center h-11 sm:h-12 w-full rounded-xl bg-white dark:bg-[#151d1b] border border-theme-border hover:border-emerald-500/50 dark:border-white/10 dark:hover:border-emerald-500/40 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:focus-within:ring-emerald-500/20 focus-within:hover:border-emerald-500 shadow-xs transition-all duration-150">
                <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  disabled={submitting}
                  className="w-full h-full bg-transparent pl-10 pr-3.5 text-base sm:text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-theme-text-secondary"
              >
                Password
              </label>
              <div className="group relative flex items-center h-11 sm:h-12 w-full rounded-xl bg-white dark:bg-[#151d1b] border border-theme-border hover:border-emerald-500/50 dark:border-white/10 dark:hover:border-emerald-500/40 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 dark:focus-within:ring-emerald-500/20 focus-within:hover:border-emerald-500 shadow-xs transition-all duration-150">
                <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  disabled={submitting}
                  style={{
                    letterSpacing: showPassword || !password ? "normal" : "0.18em",
                  }}
                  className="w-full h-full bg-transparent pl-10 pr-11 text-base sm:text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  className="absolute right-2 flex items-center justify-center w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Submit Button (Emerald CTA) */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_-2px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Switch Between Login and Signup */}
          <div className="mt-5 text-center text-xs text-theme-text-secondary">
            {isLogin ? (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-colors ml-0.5"
                >
                  Create one
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-colors ml-0.5"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          {/* Security & Privacy Assurance (WhatsApp-Style Trust Badge) */}
          <div className="mt-6 pt-4 border-t border-theme-border/60 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>End-to-End Encrypted</span>
            </div>
            <p className="text-[10px] text-theme-text-muted mt-0.5 max-w-xs leading-relaxed">
              Your messages stay private and encrypted on your device.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};
