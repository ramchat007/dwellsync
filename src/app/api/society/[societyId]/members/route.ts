import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import {
  isAuthorizedSocietyAdmin,
  canManageRoles,
  validateMemberQuery,
  ALLOWED_ASSIGNABLE_ROLES,
} from "@/lib/auth/societyAdmin";
import { assignMembership } from "@/lib/services/membershipService";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoleId } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const identity = await getCurrentIdentity();

    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 1. Authorization: Only authorized society administrators
    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Unauthorized: Society administrative privileges required to view members roster." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("pageSize");
    const rawSearch = searchParams.get("search");
    const rawRole = searchParams.get("role");
    const rawStatus = searchParams.get("status");
    const rawUnit = searchParams.get("unitNumber");
    const rawBuildingId = searchParams.get("buildingId");
    const rawWingId = searchParams.get("wingId");
    const rawUnitId = searchParams.get("unitId");

    const validation = validateMemberQuery({
      identity,
      targetSocietyId: societyId,
      page: rawPage,
      pageSize: rawPageSize,
      search: rawSearch,
      role: rawRole,
      status: rawStatus,
      unitNumber: rawUnit,
      buildingId: rawBuildingId,
      wingId: rawWingId,
      unitId: rawUnitId,
    });

    if (!validation.isValid || !validation.query) {
      return NextResponse.json(
        { error: validation.error || "Invalid query parameters" },
        { status: validation.statusCode }
      );
    }

    const {
      page,
      pageSize,
      search,
      role,
      status,
      unitNumber,
      buildingId,
      wingId,
      unitId,
    } = validation.query;
    const adminClient = createAdminClient();

    let query = adminClient
      .from("society_memberships")
      .select(
        `
        id,
        society_id,
        user_id,
        role_id,
        unit_number,
        status,
        created_at,
        updated_at,
        profile:profiles!user_id (
          id,
          email,
          full_name,
          display_name,
          phone,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("society_id", societyId);

    if (status) {
      query = query.eq("status", status);
    }

    if (role) {
      query = query.eq("role_id", role);
    }

    if (unitNumber) {
      query = query.ilike("unit_number", `%${unitNumber}%`);
    }

    if (unitId) {
      const { data: targetUnit } = await adminClient
        .from("units")
        .select("unit_number")
        .eq("id", unitId)
        .eq("society_id", societyId)
        .maybeSingle();

      if (!targetUnit) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 1 },
        });
      }
      query = query.eq("unit_number", targetUnit.unit_number);
    } else if (buildingId || wingId) {
      let unitQuery = adminClient
        .from("units")
        .select("unit_number")
        .eq("society_id", societyId);

      if (buildingId) {
        unitQuery = unitQuery.eq("building_id", buildingId);
      }
      if (wingId) {
        unitQuery = unitQuery.eq("wing_id", wingId);
      }

      const { data: matchingUnits, error: unitErr } = await unitQuery;
      if (unitErr) {
        console.error("[members GET] Unit lookup error:", unitErr);
      }
      const unitNumbers = (matchingUnits || []).map((u: any) => u.unit_number).filter(Boolean);
      if (unitNumbers.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 1 },
        });
      }
      query = query.in("unit_number", unitNumbers);
    }

    query = query.order("created_at", { ascending: false });

    if (search) {
      // Execute query and filter across profile fields and unit number in memory for exact search
      const { data: allMembers, error: fetchErr } = await query;
      if (fetchErr) {
        console.error("[members GET] Search query error:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
      }

      const searchLower = search.toLowerCase();
      const filtered = (allMembers || []).filter((m: any) => {
        const profile = m.profile || {};
        const nameMatch =
          (profile.full_name || "").toLowerCase().includes(searchLower) ||
          (profile.display_name || "").toLowerCase().includes(searchLower);
        const emailMatch = (profile.email || "").toLowerCase().includes(searchLower);
        const phoneMatch = (profile.phone || "").toLowerCase().includes(searchLower);
        const unitMatch = (m.unit_number || "").toLowerCase().includes(searchLower);
        const roleMatch = (m.role_id || "").toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || phoneMatch || unitMatch || roleMatch;
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const from = (page - 1) * pageSize;
      const paginatedData = filtered.slice(from, from + pageSize);

      return NextResponse.json({
        success: true,
        data: paginatedData,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    } else {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: members, count, error: fetchErr } = await query.range(from, to);

      if (fetchErr) {
        console.error("[members GET] Paginated query error:", fetchErr);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
      }

      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      return NextResponse.json({
        success: true,
        data: members || [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    }
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[members GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const identity = await getCurrentIdentity();

    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 1. Authorization: Only authorized role managers
    if (!canManageRoles(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator authorization required to add members." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, full_name, role_id, unit_number } = body;

    if (!email || !role_id) {
      return NextResponse.json({ error: "Email and Role are required" }, { status: 400 });
    }

    if (role_id === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot assign SUPER_ADMIN platform role" },
        { status: 403 }
      );
    }

    if (!ALLOWED_ASSIGNABLE_ROLES.includes(role_id as RoleId)) {
      return NextResponse.json(
        { error: `Invalid role '${role_id}'. Allowed roles: ${ALLOWED_ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Find or create user
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let targetUserId = (existingUsers?.users || []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )?.id;

    if (!targetUserId) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: "TestPassword@123",
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0] },
      });

      if (createError || !newUser.user) {
        return NextResponse.json(
          { error: createError?.message || "Failed to create user" },
          { status: 500 }
        );
      }
      targetUserId = newUser.user.id;
    }

    // 3. Ensure profile exists
    await adminClient.from("profiles").upsert(
      {
        id: targetUserId,
        email,
        full_name: full_name || email.split("@")[0],
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 4. Assign membership
    const result = await assignMembership(
      {
        society_id: societyId,
        user_id: targetUserId,
        role_id,
        unit_number: unit_number || null,
        status: "ACTIVE",
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[members POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
