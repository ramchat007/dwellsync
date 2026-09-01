import React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentIdentity } from "@/lib/auth/server";
import { SocietyClient } from "./SocietyClient";
import { Society } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function SuperAdminSocietiesPage() {
  await getCurrentIdentity();
  const adminClient = createAdminClient();

  const { data: societies } = await adminClient
    .from("societies")
    .select("*")
    .order("created_at", { ascending: false });

  return <SocietyClient initialSocieties={(societies as Society[]) || []} />;
}
