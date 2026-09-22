import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";
import { SecurityHeader } from "@/components/security/SecurityHeader";

export const dynamic = "force-dynamic";

export default async function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const profile = identity.effectiveUser;

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {identity.isImpersonating && <ImpersonationBanner />}

      <SecurityHeader profile={profile} society={society} />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

