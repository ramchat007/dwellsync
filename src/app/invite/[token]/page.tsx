import React from "react";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getInvitationByToken } from "@/lib/services/invitationService";
import { InviteLandingClient } from "./InviteLandingClient";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const identity = await getCurrentIdentity();
  const inviteResult = await getInvitationByToken(token);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
      <InviteLandingClient
        token={token}
        initialInvite={inviteResult.success && inviteResult.data ? inviteResult.data : null}
        error={!inviteResult.success ? inviteResult.error : null}
        currentUser={identity?.isAuthenticated ? identity.effectiveUser : null}
      />
    </div>
  );
}
