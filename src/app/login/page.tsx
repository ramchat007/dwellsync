"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Shield, Lock, Mail, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEV_PERSONAS = [
  { label: "Platform Super Admin", email: "superadmin@dwellsync.internal", role: "SUPER_ADMIN", badge: "Platform Owner" },
  { label: "Society Admin", email: "admin@greenvalley.internal", role: "SOCIETY_ADMIN", badge: "Admin" },
  { label: "Secretary", email: "secretary@greenvalley.internal", role: "SECRETARY", badge: "Governance" },
  { label: "Treasurer", email: "treasurer@greenvalley.internal", role: "TREASURER", badge: "Finance" },
  { label: "Committee Member", email: "committee@greenvalley.internal", role: "COMMITTEE_MEMBER", badge: "Committee" },
  { label: "Facility Manager", email: "manager@greenvalley.internal", role: "MANAGER", badge: "Operations" },
  { label: "Resident", email: "resident@greenvalley.internal", role: "RESIDENT", badge: "Resident" },
  { label: "Property Owner", email: "owner@greenvalley.internal", role: "OWNER", badge: "Owner" },
  { label: "Tenant", email: "tenant@greenvalley.internal", role: "TENANT", badge: "Tenant" },
  { label: "Security Guard", email: "security@greenvalley.internal", role: "SECURITY", badge: "Gate Security" },
  { label: "Staff / Maintenance", email: "staff@greenvalley.internal", role: "STAFF", badge: "Staff" },
  { label: "Vendor", email: "vendor@greenvalley.internal", role: "VENDOR", badge: "Vendor" },
  { label: "Financial Auditor", email: "auditor@greenvalley.internal", role: "AUDITOR", badge: "Audit" },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const { refreshSession } = useAuth();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "superadmin@dwellsync.internal",
      password: "TestPassword@123",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthError(data.error || "Authentication failed. Please check your credentials.");
        return;
      }

      await refreshSession();
      const target = redirectTo || data.redirectUrl || "/superadmin";
      router.push(target);
      router.refresh();
    } catch (err) {
      console.error("Login submission error:", err);
      setAuthError("Network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDevPersona = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "TestPassword@123");
    setAuthError(null);
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-900">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Login Form Card */}
        <div className="lg:col-span-7">
          <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur">
            <CardHeader className="space-y-2 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-indigo-400">
                <Building2 className="w-6 h-6" />
                <span className="font-bold tracking-wider text-base uppercase">DwellSync</span>
              </div>
              <CardTitle className="text-2xl font-bold text-white">Sign In to Platform</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                &ldquo;Every Rupee. Every Task. Every Decision. Accountable.&rdquo;
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="user@dwellsync.internal"
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    disabled={isLoading}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-[11px] text-red-400">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    disabled={isLoading}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-[11px] text-red-400">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-10 mt-2 shadow-lg shadow-indigo-600/30"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Authenticate Identity
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="pt-0 border-t border-slate-800/80 mt-4 text-[11px] text-slate-500 justify-between">
              <span>Secure Session Architecture</span>
              <span className="font-mono text-slate-400">PostgreSQL RLS Protected</span>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Development Persona Quick Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-200">
                  Development Personas
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-mono border border-indigo-800">
                13 REAL USERS
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Click any seeded persona to load real Supabase test credentials:
            </p>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {DEV_PERSONAS.map((persona) => (
                <button
                  key={persona.email}
                  type="button"
                  onClick={() => handleSelectDevPersona(persona.email)}
                  className="w-full text-left p-2 rounded-lg bg-slate-900/90 hover:bg-indigo-950/60 hover:border-indigo-700/60 border border-slate-800/80 transition-all flex items-center justify-between text-xs group"
                >
                  <div className="truncate pr-2">
                    <div className="font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                      {persona.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      {persona.email}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-indigo-900 group-hover:text-indigo-200 shrink-0 font-mono font-medium">
                    {persona.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
