import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data: societies, error } = await adminClient
      .from("societies")
      .select("id, name, code, city, state, address_line_1, status")
      .order("name", { ascending: true });

    if (error) {
      console.error("[society/directory GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch societies" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      societies: societies || [],
    });
  } catch (err: any) {
    console.error("[society/directory GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

