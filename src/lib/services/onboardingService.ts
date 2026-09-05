import { createAdminClient } from "../supabase/admin";
import { Society, RoleId } from "../types/database";
import { onboardingSchema, OnboardingInput } from "../validations/onboarding";
import { recordAuditLog } from "../auth/audit";

export async function createSocietyOnboarding(
  input: OnboardingInput,
  actorUserId?: string
): Promise<{
  success: boolean;
  society?: Society;
  adminUserId?: string;
  error?: string;
}> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const data = parsed.data;

  // 1. Check duplicate society code
  const { data: existingCode } = await adminClient
    .from("societies")
    .select("id")
    .eq("code", data.code.toUpperCase().trim())
    .maybeSingle();

  if (existingCode) {
    return { success: false, error: `Society code '${data.code}' is already registered.` };
  }

  // 2. Create Society Record
  const { data: newSociety, error: societyError } = await adminClient
    .from("societies")
    .insert({
      name: data.name,
      code: data.code.toUpperCase().trim(),
      registration_number: data.registration_number || null,
      society_type: data.society_type,
      logo_url: data.logo_url || null,
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2 || null,
      landmark: data.landmark || null,
      city: data.city,
      district: data.district || null,
      state: data.state,
      pincode: data.pincode,
      country: data.country,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website: data.website || null,
      timezone: data.timezone,
      currency: data.currency,
      status: data.status || "ONBOARDING",
      created_by: actorUserId || null,
      updated_by: actorUserId || null,
    })
    .select()
    .single();

  if (societyError || !newSociety) {
    console.error("[onboardingService] Error creating society:", societyError);
    return { success: false, error: societyError?.message || "Failed to create society record" };
  }

  // 3. Create or Link Initial Society Admin User
  let adminUserId = "";
  const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = (existingAuthUsers?.users || []).find(
    (u) => u.email?.toLowerCase() === data.admin_email.toLowerCase()
  );

  if (existingUser) {
    adminUserId = existingUser.id;
  } else {
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: data.admin_email,
      password: data.admin_password || "TestPassword@123",
      email_confirm: true,
      user_metadata: {
        full_name: data.admin_full_name,
        phone: data.admin_phone,
      },
    });

    if (authError || !newAuthUser.user) {
      console.error("[onboardingService] Error creating admin user:", authError);
      return { success: false, error: authError?.message || "Failed to create administrator auth account" };
    }
    adminUserId = newAuthUser.user.id;
  }

  // 4. Ensure Profile Exists
  await adminClient.from("profiles").upsert(
    {
      id: adminUserId,
      email: data.admin_email,
      full_name: data.admin_full_name,
      display_name: data.admin_full_name.split(" ")[0],
      phone: data.admin_phone || null,
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // 5. Assign SOCIETY_ADMIN Membership
  await adminClient.from("society_memberships").upsert(
    {
      society_id: newSociety.id,
      user_id: adminUserId,
      role_id: "SOCIETY_ADMIN" as RoleId,
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "society_id,user_id,role_id" }
  );

  // 6. Pre-create initial buildings and floors if specified
  if (data.towers && data.towers.length > 0) {
    for (const tower of data.towers) {
      const { data: building } = await adminClient
        .from("buildings")
        .insert({
          society_id: newSociety.id,
          name: tower.name,
          code: tower.code.toUpperCase().trim(),
          number_of_floors: tower.number_of_floors,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (building) {
        for (let floorNum = 0; floorNum <= tower.number_of_floors; floorNum++) {
          const floorLabel = floorNum === 0 ? "Ground Floor" : `Floor ${floorNum}`;
          await adminClient.from("floors").insert({
            society_id: newSociety.id,
            building_id: building.id,
            name: floorLabel,
            floor_number: floorNum,
            display_order: floorNum,
            status: "ACTIVE",
          });
        }
      }
    }
  }

  // 7. Audit Log
  await recordAuditLog({
    actorUserId,
    effectiveUserId: adminUserId,
    societyId: newSociety.id,
    action: "SOCIETY_CREATED",
    resourceType: "societies",
    resourceId: newSociety.id,
    metadata: {
      name: newSociety.name,
      code: newSociety.code,
      admin_email: data.admin_email,
      towers_created: data.towers?.length || 0,
    },
  });

  return {
    success: true,
    society: newSociety as Society,
    adminUserId,
  };
}

