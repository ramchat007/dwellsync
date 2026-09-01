# DwellSync — Super Admin Account Setup & Architecture Guide

## Overview
In DwellSync, **Super Admin is a private, database-driven platform persona**.
Super Admin privileges are strictly derived from the PostgreSQL database (`public.platform_admins` table) and verified server-side. No email addresses or secrets are hardcoded in application logic.

---

## 1. Database Model for Super Admin

The platform authorization schema is structured as follows:

```sql
-- public.platform_admins defines platform-wide SUPER_ADMIN privileges
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL DEFAULT 'SUPER_ADMIN' REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);
```

---

## 2. Setting Up Your Super Admin Account

### Method A: Direct SQL in Supabase SQL Editor (Recommended)

1. Open your **Supabase Dashboard $\rightarrow$ SQL Editor**.
2. Run the following SQL query to register and grant yourself `SUPER_ADMIN`:

```sql
-- Step 1: Create or update your profile in public.profiles
INSERT INTO public.profiles (id, email, phone, full_name, display_name, status)
VALUES (
  gen_random_uuid(),
  'your-email@example.com',    -- Replace with your email
  '+919876543210',             -- Replace with your Indian mobile number
  'Platform Super Admin',
  'Super Admin',
  'ACTIVE'
)
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, phone = EXCLUDED.phone, status = 'ACTIVE';

-- Step 2: Grant SUPER_ADMIN role in platform_admins
INSERT INTO public.platform_admins (user_id, role_id)
SELECT id, 'SUPER_ADMIN'
FROM public.profiles
WHERE email = 'your-email@example.com' OR phone = '+919876543210'
ON CONFLICT (user_id) DO UPDATE SET role_id = 'SUPER_ADMIN';

-- Step 3: Verify the record
SELECT p.id, p.email, p.phone, p.full_name, pa.role_id 
FROM public.profiles p
JOIN public.platform_admins pa ON pa.user_id = p.id
WHERE pa.role_id = 'SUPER_ADMIN';
```

---

### Method B: Development Bootstrap Utility

You can also bootstrap or promote any account using the command-line script:

```bash
# In your local environment
npx tsx scripts/bootstrap-superadmin.ts your-email@example.com +919876543210
```

---

## 3. Server-Side Security & Verification

Super Admin privileges are strictly checked on the server in:
- `requireSuperAdmin()` ([`src/lib/auth/server.ts`](file:///c:/Rupesh/React%20Projects/DwellSync/src/lib/auth/server.ts))
- `SuperAdminLayout` ([`src/app/superadmin/layout.tsx`](file:///c:/Rupesh/React%20Projects/DwellSync/src/app/superadmin/layout.tsx))
- Next.js middleware ([`src/middleware.ts`](file:///c:/Rupesh/React%20Projects/DwellSync/src/middleware.ts))

Client-side tampering (`localStorage`, URL query parameters, hidden form fields) cannot escalate privileges because `getCurrentIdentity()` queries `public.platform_admins` on every request.

---

## 4. Super Admin Login & View-As Workflow

1. **Sign In**: Go to `/login` and enter your mobile number or email.
2. **Private Route**: Upon authentication, DwellSync detects your `SUPER_ADMIN` role and automatically redirects to the private console at `/superadmin/view-as`.
3. **View-As Persona**:
   - Select target Role (e.g. `Resident`, `Treasurer`, `Secretary`, `Security`).
   - Select target Society (e.g. `Green Valley CHS`).
   - Select specific User.
   - Click **"Launch View-As Session"**.
4. **Exit View**:
   - The top banner displays `"Viewing DwellSync as [User] • Role: [Role] • Society: [Society] • [Exit View]"`.
   - Clicking **"Exit View"** terminates the session and returns to `/superadmin/view-as`.

---

## 5. Revoking Super Admin Privileges

To revoke Super Admin access from any account:

```sql
DELETE FROM public.platform_admins 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'your-email@example.com');
```

The user will immediately lose access to `/superadmin/*` routes on their next request.

