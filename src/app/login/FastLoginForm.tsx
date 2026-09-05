"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Smartphone,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Globe,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/client";
import { normalizeIndianPhoneNumber, formatPhoneDisplay } from "@/lib/utils/phone";
import { AuthContextResult } from "@/lib/auth/providers/types";

type LoginStep =
  | "phone_input"
  | "otp_verify"
  | "email_input"
  | "password_fallback"
  | "choose_community"
  | "choose_role"
  | "unlinked_account";

export function FastLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const { refreshSession } = useAuth();

  const [step, setStep] = useState<LoginStep>("phone_input");
  const [authMethod, setAuthMethod] = useState<"mobile" | "email">("mobile");
  const [identifier, setIdentifier] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Post-auth state for multi-society/multi-role resolution
  const [authContext, setAuthContext] = useState<AuthContextResult | null>(null);

  // Unlinked Request Access Form
  const [requestSocietyName, setRequestSocietyName] = useState("");
  const [requestUnitNumber, setRequestUnitNumber] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 30s Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp_verify" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle Request OTP (Mobile or Email)
  const handleSendOtp = async (methodToUse: "mobile" | "email" = authMethod) => {
    try {
      setIsLoading(true);
      setError(null);
      setInfoMessage(null);

      let targetIdentifier = identifier.trim();
      if (methodToUse === "mobile") {
        const norm = normalizeIndianPhoneNumber(targetIdentifier);
        if (!norm.isValid || !norm.canonical) {
          setError(norm.error || "Please enter a valid 10-digit Indian mobile number.");
          setIsLoading(false);
          return;
        }
        targetIdentifier = norm.canonical;
        setDisplayPhone(norm.display || targetIdentifier);
      } else {
        if (!targetIdentifier || !targetIdentifier.includes("@")) {
          setError("Please enter a valid email address.");
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: targetIdentifier,
          method: methodToUse,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Unable to send verification code. Please try again.");
        return;
      }

      setAuthMethod(methodToUse);
      setIsDevMode(!!data.isDev);
      setInfoMessage(data.message || null);
      setStep("otp_verify");
      setCountdown(data.cooldownSeconds || 30);
      setCanResend(false);
      setOtpValues(["", "", "", "", "", ""]);

      // Focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      console.error(err);
      setError("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    // Check if user pasted a 6-digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      if (digits.length > 0) {
        const newOtp = [...otpValues];
        digits.forEach((d, i) => {
          if (index + i < 6) newOtp[index + i] = d;
        });
        setOtpValues(newOtp);
        const nextIndex = Math.min(index + digits.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
        if (newOtp.every((d) => d !== "")) {
          handleVerifyOtp(newOtp.join(""));
        }
        return;
      }
    }

    const singleDigit = value.slice(-1).replace(/\D/g, "");
    const newOtp = [...otpValues];
    newOtp[index] = singleDigit;
    setOtpValues(newOtp);

    // Auto-advance to next box
    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    if (singleDigit && index === 5 && newOtp.every((d) => d !== "")) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  // Handle Backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullOtp = codeToVerify || otpValues.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp: fullOtp,
          method: authMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "The code is incorrect or has expired.");
        return;
      }

      await refreshSession();

      const context: AuthContextResult = data.context;
      setAuthContext(context);

      // Evaluate Next View State
      if (context.isSuperAdmin) {
        window.location.href = "/superadmin/view-as";
      } else if (context.requiresSocietySelection) {
        setStep("choose_community");
      } else if (context.requiresRoleSelection) {
        setStep("choose_role");
      } else if (context.societyMemberships.length === 0) {
        setStep("unlinked_account");
      } else {
        const target = redirectTo || context.redirectUrl || "/resident/dashboard";
        window.location.href = target;
      }
    } catch (err) {
      console.error(err);
      setError("Network error during verification. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Legacy Password Fallback
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid credentials.");
        return;
      }

      await refreshSession();
      const target = redirectTo || data.redirectUrl || "/dashboard";
      window.location.href = target;
    } catch (err) {
      setError("Network connection error.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Multi-Society Selection
  const handleSelectSociety = async (societyId: string) => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/switch-society", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ societyId }),
      });
      await refreshSession();
      window.location.href = `/society/${societyId}/dashboard`;
    } catch (err) {
      setError("Failed to set community context.");
      setIsLoading(false);
    }
  };

  // Handle Unlinked Access Request
  const handleRequestAccess = async () => {
    if (!requestSocietyName) {
      setError("Please enter the name of your society/apartment.");
      return;
    }
    try {
      setIsLoading(true);
      await fetch("/api/auth/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyName: requestSocietyName,
          unitNumber: requestUnitNumber,
        }),
      });
      setRequestSent(true);
    } catch (err) {
      setError("Failed to send request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-slate-800 bg-slate-950/95 text-white shadow-2xl backdrop-blur">
        {/* Brand Header */}
        <CardHeader className="space-y-2 pb-5 border-b border-slate-800/80 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 text-indigo-400 mx-auto">
            <Building2 className="w-7 h-7" />
            <span className="font-bold tracking-wider text-lg uppercase text-white">DwellSyncHub</span>
          </Link>
          <CardTitle className="text-xl sm:text-2xl font-bold text-white pt-1">
            {step === "otp_verify"
              ? "Enter Verification Code"
              : step === "choose_community"
              ? "Choose your Community"
              : step === "choose_role"
              ? "Choose how you want to continue"
              : step === "unlinked_account"
              ? "Account Connected"
              : "Welcome to DwellSyncHub 👋"}
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            {step === "otp_verify"
              ? `6-digit OTP sent to ${displayPhone || identifier}`
              : step === "choose_community"
              ? "Select which housing society you want to access today."
              : step === "unlinked_account"
              ? "Your account is verified. Connect to your housing society to begin."
              : "Sign in to continue to your community."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 text-xs space-y-4">
          {/* Error Message Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 flex items-start gap-2 animate-in fade-in-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dev Mode Notification */}
          {isDevMode && infoMessage && (
            <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{infoMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setOtpValues(["1", "2", "3", "4", "5", "6"]);
                  handleVerifyOtp("123456");
                }}
                className="underline hover:text-white text-indigo-300 font-semibold"
              >
                Auto-Fill
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: MOBILE NUMBER PRIMARY AUTH                                        */}
          {/* ========================================================================= */}
          {step === "phone_input" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile Number *</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-300 font-mono text-xs shrink-0 select-none">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="98765 43210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp("mobile")}
                    disabled={isLoading}
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 text-xs font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  We will send a 6-digit one-time password via SMS.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => handleSendOtp("mobile")}
                disabled={isLoading || !identifier.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-11 shadow-lg shadow-indigo-600/30 text-xs gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Mobile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink-0 mx-3 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Secondary Options */}
              <div className="space-y-2">
                {/* Google OAuth Button */}
                <a href="/api/auth/oauth/google" className="block w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-10 text-xs font-medium gap-2 justify-center"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </Button>
                </a>

                {/* Email OTP Option */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIdentifier("");
                    setError(null);
                    setStep("email_input");
                  }}
                  className="w-full border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-10 text-xs font-medium gap-2 justify-center"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Continue with Email</span>
                </Button>

                {/* WhatsApp Coming Soon Badge */}
                <div className="p-2 rounded-lg border border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="text-emerald-400">💬</span> WhatsApp Login
                  </span>
                  <Badge variant="purple" className="font-mono text-[9px]">
                    COMING SOON
                  </Badge>
                </div>
              </div>

              {/* Password Fallback Link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("password_fallback");
                  }}
                  className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  Sign in with password
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN (MOBILE-FIRST)                    */}
          {/* ========================================================================= */}
          {step === "otp_verify" && (
            <div className="space-y-5">
              {/* 6 Digit Input Grid */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={isLoading}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Action Button */}
              <Button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otpValues.some((v) => v === "")}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-11 shadow-lg shadow-indigo-600/30 text-xs gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Resend & Change Number Actions */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setStep(authMethod === "mobile" ? "phone_input" : "email_input");
                    setError(null);
                  }}
                  className="hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change {authMethod === "mobile" ? "Number" : "Email"}</span>
                </button>

                <div>
                  {countdown > 0 ? (
                    <span className="font-mono text-slate-500">Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(authMethod)}
                      disabled={isLoading}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: EMAIL OTP FALLBACK                                                */}
          {/* ========================================================================= */}
          {step === "email_input" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address *</span>
                </label>
                <Input
                  type="email"
                  placeholder="resident@society.org"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp("email")}
                  disabled={isLoading}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 text-xs"
                  autoFocus
                />
              </div>

              <Button
                type="button"
                onClick={() => handleSendOtp("email")}
                disabled={isLoading || !identifier.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-10 shadow-lg shadow-indigo-600/30 text-xs gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier("");
                  setError(null);
                  setStep("phone_input");
                }}
                className="w-full text-center text-[11px] text-slate-400 hover:text-white pt-2 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Mobile Login</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PASSWORD FALLBACK (FOR LEGACY / PRE-PHASE SEEDED USERS)            */}
          {/* ========================================================================= */}
          {step === "password_fallback" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email or Mobile</span>
                </label>
                <Input
                  type="text"
                  placeholder="user@DwellSyncHub.internal"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Password</span>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !identifier || !password}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-10 shadow-lg shadow-indigo-600/30 text-xs gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("phone_input");
                }}
                className="w-full text-center text-[11px] text-slate-400 hover:text-white pt-1 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Mobile OTP Login</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: MULTI-SOCIETY SELECTION                                           */}
          {/* ========================================================================= */}
          {step === "choose_community" && authContext && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                You hold active memberships in multiple societies. Select one to proceed:
              </p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {authContext.availableSocieties.map((soc) => (
                  <button
                    key={soc.id}
                    type="button"
                    onClick={() => handleSelectSociety(soc.id)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-600 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-indigo-300 text-xs">
                        {soc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Code: {soc.code} &middot; {soc.city || "India"}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: UNLINKED / PENDING SOCIETY STATE                                  */}
          {/* ========================================================================= */}
          {step === "unlinked_account" && (
            <div className="space-y-4">
              {requestSent ? (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="font-bold text-xs">Access Request Dispatched</div>
                  <p className="text-[11px] text-slate-300">
                    Your society administrator will review and link your account to your apartment. You will receive an SMS confirmation once approved.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-[11px] flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Your DwellSyncHub account is verified, but not yet linked to an active housing society.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Housing Society Name *
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Green Valley CHS"
                        value={requestSocietyName}
                        onChange={(e) => setRequestSocietyName(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Flat / Unit Number (Optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Flat 402, Wing B"
                        value={requestUnitNumber}
                        onChange={(e) => setRequestUnitNumber(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={isLoading || !requestSocietyName.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold h-10 gap-2 mt-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Society Access</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 justify-between">
          <span>By continuing, you agree to DwellSyncHub Terms</span>
          <span className="font-mono text-slate-400">PostgreSQL RLS Protected</span>
        </CardFooter>
      </Card>
    </div>
  );
}

