"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Home,
  Shield,
  ArrowRight,
  UserCheck,
  LogOut,
} from "lucide-react";
import { Invitation, Profile } from "@/lib/types/database";

interface InviteLandingClientProps {
  token: string;
  initialInvite: Invitation | null;
  error: string | null | undefined;
  currentUser: Profile | null;
}

export function InviteLandingClient({
  token,
  initialInvite,
  error: serverError,
  currentUser,
}: InviteLandingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(serverError || null);
  const [isAccepted, setIsAccepted] = useState(false);

  if (actionError || !initialInvite) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Invitation Link Invalid or Expired
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {actionError || "This invitation link is not valid or may have already been used."}
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const society = (initialInvite as any).society;
  const unit = (initialInvite as any).unit;
  const invitedEmail = initialInvite.email;

  const isEmailMatching =
    currentUser && currentUser.email?.toLowerCase() === invitedEmail.toLowerCase();

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "Failed to accept invitation.");
        return;
      }

      setIsAccepted(true);
      setTimeout(() => {
        router.push("/resident/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setActionError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutAndSwitch = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/login?redirect=/invite/${token}`;
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
      {/* Society Badge Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg shadow-blue-500/20">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {society?.name || "Society Invitation"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {society?.city ? `${society.city}, ${society.state}` : "Residential Community"}
        </p>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {isAccepted ? (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
          <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
            Welcome to {society?.name}!
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Your resident identity and unit relationship have been verified. Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Invitation Details Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 font-medium">Designated Role</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {initialInvite.role_id}
              </span>
            </div>

            {(initialInvite.unit_number || unit) && (
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 font-medium">Assigned Flat</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Flat {initialInvite.unit_number || unit?.unit_number}
                  {unit?.building?.name && ` (${unit.building.name})`}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Invited Email</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                {invitedEmail}
              </span>
            </div>
          </div>

          {/* Authentication State Handling */}
          {!currentUser ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                Please sign in with <strong className="text-slate-900 dark:text-white font-mono">{invitedEmail}</strong> to accept this invitation.
              </p>
              <Link
                href={`/login?email=${encodeURIComponent(invitedEmail)}&redirect=/invite/${token}`}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20"
              >
                <span>Sign In to Accept</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : isEmailMatching ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-blue-900 dark:text-blue-200">
                  Signed in as <strong>{currentUser.email}</strong>. Ready to claim your resident context.
                </span>
              </div>

              <button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Accept Invitation & Join Society</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                You are currently signed in as <strong>{currentUser.email}</strong>, but this invitation was sent to <strong>{invitedEmail}</strong>.
              </div>

              <button
                onClick={handleLogoutAndSwitch}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch Account</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
