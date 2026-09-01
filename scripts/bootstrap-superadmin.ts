import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { normalizeIndianPhoneNumber } from "../src/lib/utils/phone";

async function bootstrapSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const email = process.env.SUPER_ADMIN_EMAIL || process.argv[2];
  const rawPhone = process.env.SUPER_ADMIN_PHONE || process.argv[3];
  const fullName = process.env.SUPER_ADMIN_NAME || "Platform Super Admin";

  console.log("==================================================");
  console.log("DwellSync — Super Admin Promotion & Bootstrap");
  console.log("==================================================");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (!email && !rawPhone) {
    console.error("❌ ERROR: Please specify SUPER_ADMIN_EMAIL or SUPER_ADMIN_PHONE in .env.local or pass as arguments.");
    console.log("Example: npx tsx scripts/bootstrap-superadmin.ts admin@example.com +919820160376");
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const phone = rawPhone ? normalizeIndianPhoneNumber(rawPhone).canonical || rawPhone : null;

  console.log(`Locating user account for: ${email || phone}...`);

  // Query existing profile in public.profiles
  let profileQuery = adminClient.from("profiles").select("*");
  if (email) {
    profileQuery = profileQuery.eq("email", email.toLowerCase());
  } else if (phone) {
    profileQuery = profileQuery.eq("phone", phone);
  }

  const { data: existingProfile } = await profileQuery.maybeSingle();
  let userId = existingProfile?.id;

  if (!userId) {
    // Check Supabase auth.users list
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const foundUser = userList?.users?.find(
      (u) =>
        (email && u.email?.toLowerCase() === email.toLowerCase()) ||
        (phone && u.phone === phone)
    );

    if (foundUser) {
      userId = foundUser.id;
      console.log(`✓ Found existing Auth user with ID: ${userId}`);
    } else {
      // Create user record in auth
      console.log(`Creating user in Supabase Auth...`);
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email || `${phone?.replace("+", "")}@dwellsync.user`,
        phone: phone || undefined,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName,
          display_name: fullName,
        },
      });

      if (createError || !newUser.user) {
        console.error("❌ Failed to create user in Supabase Auth:", createError?.message);
        process.exit(1);
      }
      userId = newUser.user.id;
      console.log(`✓ Created Supabase Auth user: ${userId}`);
    }
  } else {
    console.log(`✓ Found existing profile ID: ${userId}`);
  }

  // 1. Upsert Profile
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
      full_name: fullName,
      display_name: fullName,
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.warn("⚠️ Warning on profile upsert:", profileError.message);
  } else {
    console.log("✓ Profile record verified in public.profiles");
  }

  // 2. Grant SUPER_ADMIN in public.platform_admins
  const { error: adminError } = await adminClient.from("platform_admins").upsert(
    {
      user_id: userId,
      role_id: "SUPER_ADMIN",
    },
    { onConflict: "user_id" }
  );

  if (adminError) {
    console.error("❌ Failed to grant platform SUPER_ADMIN role:", adminError.message);
    process.exit(1);
  }

  console.log("✓ Granted platform SUPER_ADMIN role in public.platform_admins");

  // 3. Record Audit Log
  await adminClient.from("audit_logs").insert({
    actor_user_id: userId,
    action: "SUPER_ADMIN_BOOTSTRAP",
    resource_type: "platform_admins",
    resource_id: userId,
    metadata: {
      email,
      phone,
      bootstrap_timestamp: new Date().toISOString(),
    },
  });

  console.log("==================================================");
  console.log("🎉 SUPER ADMIN PRIVILEGES CONFIGURED!");
  console.log(`User ID: ${userId}`);
  console.log(`Email:   ${email || "N/A"}`);
  console.log(`Phone:   ${phone || "N/A"}`);
  console.log("==================================================");
}

bootstrapSuperAdmin().catch((err) => {
  console.error("Unexpected error during bootstrap:", err);
  process.exit(1);
});
