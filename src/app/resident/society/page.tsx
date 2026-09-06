import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MySocietyClient } from "./MySocietyClient";

export const dynamic = "force-dynamic";

export default async function ResidentSocietyPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const adminClient = createAdminClient();
  let officeBearers: { role: string; name: string; phone?: string | null; email?: string | null }[] = [];

  if (society) {
    const { data: committee } = await adminClient
      .from("society_memberships")
      .select(`
        role_id,
        profile:profiles (
          id,
          full_name,
          display_name,
          phone,
          email
        )
      `)
      .eq("society_id", society.id)
      .in("role_id", ["SOCIETY_ADMIN", "SECRETARY", "TREASURER", "MANAGER", "COMMITTEE_MEMBER"])
      .eq("status", "ACTIVE");

    if (committee && committee.length > 0) {
      officeBearers = committee.map((m: any) => ({
        role: m.role_id.replace("_", " "),
        name: m.profile?.display_name || m.profile?.full_name || "Committee Member",
        phone: m.profile?.phone,
        email: m.profile?.email,
      }));
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <MySocietyClient
        society={society}
        officeBearers={officeBearers}
      />
    </div>
  );
}

