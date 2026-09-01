import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

async function bootstrapSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@dwellsync.internal";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@DwellSync2026!";
  const fullName = process.env.SUPER_ADMIN_NAME || "Platform Super Admin";

  console.log("==================================================");
  console.log("DwellSync — Super Admin Bootstrap Utility");
  console.log("==================================================");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    console.error("Please configure them in your .env.local file.");
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Checking existing account for: ${email}`);

  const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to list users:", listError.message);
    process.exit(1);
  }

  let user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`Creating new Supabase Auth user: ${email}...`);
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
      },
    });

    if (createError || !newUser.user) {
      console.error("❌ Failed to create Supabase Auth user:", createError?.message);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`✓ Created Supabase Auth user with ID: ${user.id}`);
  } else {
    console.log(`✓ Found existing Auth user with ID: ${user.id}`);
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: fullName,
      display_name: fullName,
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("❌ Failed to upsert profile record:", profileError.message);
  } else {
    console.log("✓ Profile record verified in public.profiles");
  }

  const { error: adminError } = await adminClient.from("platform_admins").upsert(
    {
      user_id: user.id,
      role_id: "SUPER_ADMIN",
    },
    { onConflict: "user_id" }
  );

  if (adminError) {
    console.error("❌ Failed to grant platform SUPER_ADMIN role:", adminError.message);
    process.exit(1);
  }

  console.log("✓ Granted platform SUPER_ADMIN role in public.platform_admins");

  await adminClient.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "SUPER_ADMIN_BOOTSTRAP",
    resource_type: "platform_admins",
    resource_id: user.id,
    metadata: {
      email,
      bootstrap_timestamp: new Date().toISOString(),
    },
  });

  console.log("✓ Logged SUPER_ADMIN_BOOTSTRAP in public.audit_logs");
  console.log("==================================================");
  console.log("🎉 SUPER ADMIN BOOTSTRAP COMPLETE!");
  console.log(`Email:    ${email}`);
  console.log(`User ID:  ${user.id}`);
  console.log("You can now sign in at: /login");
  console.log("==================================================");
}

bootstrapSuperAdmin().catch((err) => {
  console.error("Unexpected error during bootstrap:", err);
  process.exit(1);
});
