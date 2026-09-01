import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Society } from "@/lib/types/database";
import { ViewAsConsoleClient } from "./ViewAsConsoleClient";

export const dynamic = "force-dynamic";

export default async function ViewAsConsolePage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isSuperAdmin) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();
  const { data: societies } = await adminClient
    .from("societies")
    .select("*")
    .order("name", { ascending: true });

  const societyList = (societies as Society[]) || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ViewAsConsoleClient
        societies={societyList}
        currentAdminEmail={identity.originalUser?.email || identity.originalUser?.phone || "Platform Super Admin"}
      />
    </div>
  );
}

