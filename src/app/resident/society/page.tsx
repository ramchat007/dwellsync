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
    } else {
      officeBearers = [
        { role: "Society Secretary", name: "Ananya Deshmukh", phone: "+91 98201 11223", email: "secretary@greenvalley.internal" },
        { role: "Society Treasurer", name: "Rajesh Iyer", phone: "+91 98201 44556", email: "treasurer@greenvalley.internal" },
        { role: "Facility Manager", name: "Manoj Sawant", phone: "+91 98201 77889", email: "manager@greenvalley.internal" },
      ];
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

