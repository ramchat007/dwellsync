# Platform Super Admin & Bootstrap Architecture

## Super Admin Concept

The **SUPER_ADMIN** is the platform owner of DwellSync. Unlike a Society Admin (who manages a single tenant), the Super Admin governs the SaaS infrastructure, society tenants, platform users, system diagnostics, and audit logs.

## Security Constraints

1. **No Hardcoding**: Super Admin emails, IDs, and passwords are never hardcoded in source files.
2. **Database Representation**: Super Admin status is granted by a real row in `public.platform_admins`.
3. **No Public Escalation Route**: There is no public "Become Super Admin" endpoint or self-assignment capability.

## Super Admin Bootstrap Process

### Local Development Bootstrap:
1. Configure `.env.local`:
   ```env
   SUPER_ADMIN_EMAIL=superadmin@dwellsync.internal
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   SUPER_ADMIN_NAME="Platform Super Admin"
   ```
2. Run the bootstrap script:
   ```bash
   npm run bootstrap:superadmin
   ```

### Production Bootstrap:
1. Set the secure environment variables `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in your production hosting platform (e.g. Vercel / Railway / Supabase secrets).
2. Execute the one-time bootstrap script via server CLI:
   ```bash
   npx tsx scripts/bootstrap-superadmin.ts
   ```
3. Verify in Supabase database:
   - User exists in `auth.users`
   - User profile exists in `public.profiles`
   - User ID is recorded in `public.platform_admins` with `role_id = 'SUPER_ADMIN'`
   - Audit log entry `SUPER_ADMIN_BOOTSTRAP` is recorded in `public.audit_logs`
