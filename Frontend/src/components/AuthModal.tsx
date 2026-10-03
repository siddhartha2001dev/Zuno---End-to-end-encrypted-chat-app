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
import { ThemeToggle } from "./ThemeToggle";

interface AuthModalProps {
  initialEmail?: string;
  successBanner?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialEmail, successBanner }) => {
  const authScrollRef = React.useRef<HTMLElement | null>(null);
  const {
    login,
    register,
    resendVerification,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    clearPendingVerification,
  } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "register" || mode === "signup") {
        return false;
      }
    }
    return true;
  });
  const [forgotMode, setForgotMode] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("resetToken");
  });
  const [name, setName] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [chatIdStatus, setChatIdStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [chatIdMessage, setChatIdMessage] = useState<string>("");
  const [email, setEmail] = useState<string>(() => initialEmail || "");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // When an error expands the form, reveal the submit button inside the
  // fixed-height auth scroll area instead of leaving it below the viewport.
  React.useEffect(() => {
    if (!error || !authScrollRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const scrollArea = authScrollRef.current;
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: "smooth" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [error]);

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
      if (forgotMode) {
        if (!email.trim()) {
          setError("Email address is required");
          return;
        }
        const result = await api.auth.forgotPassword(email.trim());
        setResetSuccess(result.message);
        return;
      }

      if (resetToken) {
        if (password.length < 6) {
          setError("Password must be at least 6 characters long");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const result = await api.auth.resetPassword(resetToken, password);
        setResetSuccess(result.message);
        setResetToken(null);
        setPassword("");
        setConfirmPassword("");
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (isLogin) {
        await login(email.trim(), password);
      } else {
        if (!name.trim()) {
          setError("Name is required");
          setSubmitting(false);
          return;
        }

        if (name.trim().length < 2) {
          setError("Name must be at least 2 characters long");
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

        if (password.length < 6) {
          setError("Password must be at least 6 characters long");
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
      const msg = err?.message || (isLogin ? "Invalid email or password" : "Failed to create account. Please try again.");
      setError(msg);
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
  // Shared top navigation bar
  // ───────────────────────────────────────────
  const renderNavbar = () => (
    <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-end z-20 relative">
      <div className="flex items-center gap-2">
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
        {/* Top Navbar */}
        {renderNavbar()}

        {/* Centered Verification Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
          <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-modal relative">
            {/* Mail Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent">
                <MailCheck className="w-7 h-7" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-text mb-1.5">
                Check your email
              </h2>
              <p className="text-xs sm:text-sm text-theme-text-secondary leading-relaxed">
                We've sent a verification link to
              </p>
              <p className="text-xs sm:text-sm font-semibold text-theme-accent mt-1 break-all">
                {pendingVerificationEmail}
              </p>
            </div>

            {/* Step Instructions */}
            <div className="space-y-2.5 mb-5 text-left">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-theme-accent/10 flex items-center justify-center text-xs font-semibold text-theme-accent">
                  1
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  Open the verification email sent by <strong className="text-theme-text font-medium">Zuno Chat</strong>
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-theme-accent/10 flex items-center justify-center text-xs font-semibold text-theme-accent">
                  2
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  Click <strong className="text-theme-text font-medium">"Verify My Email"</strong> link inside
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-bg/60 border border-theme-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-theme-accent/10 flex items-center justify-center text-xs font-semibold text-theme-accent">
                  ✓
                </span>
                <p className="text-xs text-theme-text-secondary leading-normal">
                  You'll be <strong className="text-theme-text font-medium">automatically logged in</strong> to your chats
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
              className="w-full py-2.5 px-4 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-theme-text font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
                  <span>Sending email...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-theme-accent" />
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
                className="text-xs text-theme-text-muted hover:text-theme-accent font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
      {/* Top Navbar */}
      {renderNavbar()}

      {/* Centered Modern Chat App Card */}
      <main ref={authScrollRef} className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[420px] bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-modal relative">
          
          {/* Brand Icon Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3">
              <div className="w-14 h-14 rounded-2xl bg-theme-accent/10 border border-theme-accent/20 p-2.5 flex items-center justify-center">
                <img src="/messages.png" alt="Zuno" className="w-9 h-9 object-contain" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-text">
              {forgotMode ? "Forgot your password?" : resetToken ? "Choose a new password" : isLogin ? "Sign in to Zuno" : "Create your account"}
            </h1>
            <p className="text-xs sm:text-sm text-theme-text-secondary mt-1.5 leading-relaxed max-w-xs">
              {forgotMode
                ? "Enter your email and we'll send you a secure reset link."
                : resetToken
                ? "Choose a new password for your Zuno account."
                : isLogin
                ? "Welcome back. Enter your details to continue."
                : "Connect with friends and message securely."}
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
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                <span className="leading-tight flex-1">{error}</span>
              </div>

              {/* Smart Recovery: If user failed login because account doesn't exist yet */}
              {isLogin &&
                (error.toLowerCase().includes("invalid email or password") ||
                  error.toLowerCase().includes("credentials")) && (
                  <div className="pt-2 border-t border-red-500/15 flex flex-col gap-1.5">
                    <span className="text-[11px] text-theme-text-secondary">
                      Don't have a Zuno account yet?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span>Click here to Create Account with this email</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

              {/* Unverified Email Prompt */}
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

          {resetSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-xs font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{resetSuccess}</span>
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
                  <div className="group relative flex items-center h-11 w-full rounded-xl bg-theme-bg/60 border border-theme-border focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-colors">
                    <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-theme-accent transition-colors">
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
                      className="w-full h-full bg-transparent pl-10 pr-3.5 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                    />
                  </div>
                </div>

                {/* Chat ID Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="chatId"
                      className="block text-xs font-medium text-theme-text-secondary"
                    >
                      Chat ID
                    </label>
                    <span className="text-[11px] text-theme-text-muted">unique @username</span>
                  </div>
                  <div className={`group relative flex items-center h-11 w-full rounded-xl bg-theme-bg/60 border transition-colors ${
                    chatIdStatus === "available"
                      ? "border-emerald-500 ring-1 ring-emerald-500/20"
                      : chatIdStatus === "taken" || chatIdStatus === "invalid"
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : "border-theme-border focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20"
                  }`}>
                    <span className={`pointer-events-none absolute left-3.5 flex items-center justify-center transition-colors ${
                      chatIdStatus === "available"
                        ? "text-emerald-500"
                        : chatIdStatus === "taken" || chatIdStatus === "invalid"
                        ? "text-red-500"
                        : "text-theme-text-muted group-focus-within:text-theme-accent"
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
                      className="w-full h-full bg-transparent pl-10 pr-10 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                    />
                    {/* Status indicator */}
                    <span className="absolute right-3.5 flex items-center justify-center">
                      {chatIdStatus === "checking" && (
                        <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
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
                        : "text-red-500"
                    }`}>
                      {chatIdMessage}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email Address Field */}
            {!resetToken && <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-theme-text-secondary"
              >
                Email Address
              </label>
              <div className="group relative flex items-center h-11 w-full rounded-xl bg-theme-bg/60 border border-theme-border focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-colors">
                <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-theme-accent transition-colors">
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
                  className="w-full h-full bg-transparent pl-10 pr-3.5 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                />
              </div>
            </div>}

            {/* Password Field */}
            {!forgotMode && <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-theme-text-secondary"
                >
                  {resetToken ? "New password" : "Password"}
                </label>
                {!isLogin && !resetToken && (
                  <span className="text-[11px] text-theme-text-muted">Min. 6 characters</span>
                )}
              </div>
              <div className="group relative flex items-center h-11 w-full rounded-xl bg-theme-bg/60 border border-theme-border focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-colors">
                <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-theme-text-muted group-focus-within:text-theme-accent transition-colors">
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
                  className="w-full h-full bg-transparent pl-10 pr-11 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  className="absolute right-2 flex items-center justify-center w-7 h-7 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors focus:outline-none"
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
            </div>}

            {resetToken && (
              <div className="space-y-1">
                <label htmlFor="confirm-password" className="block text-xs font-medium text-theme-text-secondary">
                  Confirm new password
                </label>
                <div className="group relative flex items-center h-11 w-full rounded-xl bg-theme-bg/60 border border-theme-border focus-within:border-theme-accent focus-within:ring-1 focus-within:ring-theme-accent/20 transition-colors">
                  <Lock className="absolute left-3.5 w-4 h-4 text-theme-text-muted group-focus-within:text-theme-accent" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full h-full bg-transparent pl-10 pr-3.5 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none disabled:opacity-50 rounded-xl"
                  />
                </div>
              </div>
            )}

            {isLogin && !forgotMode && !resetToken && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError(null);
                    setResetSuccess(null);
                  }}
                  className="text-xs text-theme-accent hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 h-11 rounded-xl bg-theme-accent hover:opacity-90 text-white font-medium text-xs sm:text-sm shadow-subtle flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{forgotMode ? "Sending reset link..." : resetToken ? "Resetting password..." : isLogin ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <>
                  <span>{forgotMode ? "Send reset link" : resetToken ? "Reset password" : isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Switch Between Login and Signup / Password Recovery */}
          <div className="mt-5 text-center text-xs text-theme-text-secondary">
            {forgotMode || resetToken ? (
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setResetToken(null);
                  setError(null);
                  setResetSuccess(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="text-theme-accent font-medium hover:underline transition-colors cursor-pointer"
              >
                Back to Sign in
              </button>
            ) : isLogin ? (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                  }}
                  className="text-theme-accent font-medium hover:underline transition-colors ml-0.5 cursor-pointer"
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
                  className="text-theme-accent font-medium hover:underline transition-colors ml-0.5 cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          {/* Security & Privacy Assurance */}
          <div className="mt-6 pt-4 border-t border-theme-border/60 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-theme-accent">
              <ShieldCheck className="w-3.5 h-3.5 text-theme-accent" />
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
