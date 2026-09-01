import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(identity);
  } catch (error) {
    console.error("[API/identity] Error fetching identity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
