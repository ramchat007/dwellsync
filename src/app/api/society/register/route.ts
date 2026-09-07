import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createSocietyOnboarding } from "@/lib/services/onboardingService";
import { setAuthSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required to register a society." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      code,
      city,
      state,
      numberOfWings = 1,
      floorsPerWing = 5,
      unitsPerFloor = 4,
      role = "SOCIETY_ADMIN",
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Society name and unique code are required." },
        { status: 400 }
      );
    }

    const effectiveUser = identity.effectiveUser;
    const userEmail = effectiveUser.email || `${code.toLowerCase()}admin@dwellsync.internal`;
    const userPhone = effectiveUser.phone || "";
    const userName = effectiveUser.full_name || effectiveUser.display_name || "Society Administrator";

    // Generate towers structure
    const towers = [];
    const wingCount = Math.min(Math.max(parseInt(numberOfWings) || 1, 1), 10);
    const floorCount = Math.min(Math.max(parseInt(floorsPerWing) || 5, 1), 50);
    const unitCount = Math.min(Math.max(parseInt(unitsPerFloor) || 4, 1), 20);

    for (let i = 0; i < wingCount; i++) {
      const wingLetter = String.fromCharCode(65 + i); // 'A', 'B', 'C'...
      towers.push({
        name: `Wing ${wingLetter}`,
        code: `WING-${wingLetter}`,
        number_of_floors: floorCount,
        units_per_floor: unitCount,
      });
    }

    const onboardingPayload = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      society_type: "COOPERATIVE_HOUSING" as const,
      address_line_1: body.address || `${name}, ${city || "Mumbai"}`,
      city: city || "Mumbai",
      state: state || "Maharashtra",
      pincode: body.pincode || "400001",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: "ACTIVE" as const,
      towers,
      admin_full_name: userName,
      admin_email: userEmail,
      admin_phone: userPhone,
      admin_password: "TempPassword123!",
    };

    const result = await createSocietyOnboarding(onboardingPayload, effectiveUser.id);

    if (!result.success || !result.society) {
      return NextResponse.json({ error: result.error || "Failed to create society." }, { status: 400 });
    }

    // Refresh session cookie
    await setAuthSessionCookie({
      userId: effectiveUser.id,
      email: effectiveUser.email || undefined,
      phone: effectiveUser.phone || undefined,
      isSuperAdmin: identity.isSuperAdmin,
    });

    return NextResponse.json({
      success: true,
      societyId: result.society.id,
      redirectUrl: `/society/${result.society.id}/dashboard`,
    });
  } catch (error: any) {
    console.error("[register API POST] Server error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during society registration." },
      { status: 500 }
    );
  }
}
