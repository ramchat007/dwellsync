import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let supabaseStatus = "ok";
  let errorMessage: string | undefined;

  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envConfigured = hasUrl && hasAnon && hasServiceRole;

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("societies")
      .select("id")
      .limit(1);

    if (error) {
      dbStatus = "error";
      errorMessage = error.message;
    } else {
      dbStatus = "ok";
    }
  } catch (err: any) {
    dbStatus = "unreachable";
    supabaseStatus = "error";
    errorMessage = err?.message || "Connection failed";
  }

  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      application: "ok",
      database: dbStatus,
      supabase: supabaseStatus,
      environment: envConfigured ? "configured" : "incomplete",
      timestamp: new Date().toISOString(),
      latency_ms: latencyMs,
      ...(errorMessage ? { details: errorMessage } : {}),
    },
    { status: dbStatus === "error" || dbStatus === "unreachable" ? 503 : 200 }
  );
}

