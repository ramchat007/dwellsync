# DwellSync — Production Deployment & Configuration Guide

**Version:** 1.0.0  
**Target Environment:** Next.js 15+ (App Router) & Supabase PostgreSQL (Remote)  

This guide provides the exact operational procedure to deploy DwellSync to a live production environment and configure external providers.

---

## 1. Hosting Environment Configuration (Vercel / Netlify / VPS)

Configure the following environment variables in your hosting provider's project settings dashboard:

| Variable Name | Production Value | Security Level | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | Public | Enables React production optimizations |
| `DEV_AUTH_BYPASS` | `false` | **CRITICAL SECURITY** | Disables test OTP (`123456`) and enforces real Supabase Auth delivery |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Public | Base URL for OAuth redirects, email links, and invitation tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xjagwtlattsoxecuohok.supabase.co` | Public | Supabase API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Public | Anon/Public API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | **RESTRICTED SECRET** | Server-side only key for privileged operations |

---

## 2. Supabase Custom SMTP Configuration (Eliminating Rate Limits)

> [!WARNING]
> By default, Supabase's built-in email service is rate-limited to **3–4 emails per hour**. In production, resident invitations, OTP login codes, and society circulars will be throttled or lost unless a custom SMTP provider is connected.

### Recommended Providers with Generous Free Tiers:
- **Resend** (3,000 emails/month free) — Recommended
- **AWS SES** (62,000 emails/month free when sent from EC2)
- **SendGrid** (100 emails/day free)

### Steps to Configure in Supabase:
1. Log in to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** $\rightarrow$ **Authentication** $\rightarrow$ **SMTP Settings**.
3. Toggle **Enable Custom SMTP** to **ON**.
4. Fill in your SMTP provider details:
   - **Sender email:** `notifications@your-domain.com` (or `auth@your-domain.com`)
   - **Sender name:** `DwellSync`
   - **Host:** e.g. `smtp.resend.com` (or `smtp.sendgrid.net`)
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend` (or your provider username)
   - **Password:** Your API key / SMTP secret
5. Click **Save** and test sending an email verification code.

---

## 3. Supabase Auth Redirect URLs & Google OAuth Whitelist

Ensure all redirect URLs point to your live production domain:

1. In Supabase Dashboard, navigate to **Authentication** $\rightarrow$ **URL Configuration**.
2. Set **Site URL** to:
   ```
   https://your-domain.com
   ```
3. In **Redirect URLs**, add the following whitelisted entries:
   ```
   https://your-domain.com/api/auth/callback
   https://your-domain.com/api/auth/oauth/google
   https://your-domain.com/dashboard
   https://your-domain.com/resident/dashboard
   https://your-domain.com/login
   ```
4. *(Optional)* If Google OAuth is enabled:
   - Open [Google Cloud Console](https://console.cloud.google.com/) $\rightarrow$ **APIs & Services** $\rightarrow$ **Credentials**.
   - Under **Authorized redirect URIs**, add:
     ```
     https://xjagwtlattsoxecuohok.supabase.co/auth/v1/callback
     ```

---

## 4. Supabase Storage Buckets Verification

Verify that the following 3 storage buckets exist in Supabase Storage with the appropriate privacy settings:

1. `society-assets`
   - **Public:** Yes (Publicly accessible image CDN)
   - **Allowed MIME types:** `image/*`
   - **Use Case:** Society logos, building/wing diagrams, amenity banner photos.

2. `profile-images`
   - **Public:** Yes (Publicly accessible user avatars)
   - **Allowed MIME types:** `image/*`
   - **Use Case:** Resident and staff profile pictures.

3. `society-documents`
   - **Public:** No (Strictly Private)
   - **Security:** RLS gated through authenticated session tokens.
   - **Use Case:** Bylaws, committee minutes, vendor invoices, resident lease deeds.

---

## 5. Production Super Admin Bootstrap

Before handing over societies to external administrators, bootstrap your own primary platform Super Admin account:

```bash
# Run against the production environment
npx tsx scripts/bootstrap-superadmin.ts --email="your-admin@your-domain.com"
```

The script will:
1. Check if the user already exists in Supabase Auth (or prompt to create credentials).
2. Ensure the user profile exists in `public.profiles`.
3. Insert or verify the record in `public.platform_admins`.
4. Confirm access to `/superadmin/view-as` and `/superadmin/societies`.

---

## 6. Pre-Launch Smoke Test Checklist

Once the production build is deployed:
- [ ] Visit `https://your-domain.com` (Homepage renders with Terms and Privacy links).
- [ ] Visit `https://your-domain.com/terms` (Terms of Service renders cleanly unauthenticated).
- [ ] Visit `https://your-domain.com/privacy` (Privacy Policy renders cleanly unauthenticated).
- [ ] Test login at `https://your-domain.com/login` using your Super Admin email and password.
- [ ] Verify access to `/superadmin/view-as`.
- [ ] Create the first pilot society at `/superadmin/societies/new`.

