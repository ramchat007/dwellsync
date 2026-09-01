# DwellSync — Society Onboarding Architecture (Phase 1)

## Overview

The Society Onboarding Workflow enables Super Admin platform owners to provision a complete, isolated multi-tenant housing society into DwellSync in a structured 7-step process.

```
Super Admin Control Center
           │
           ▼
 /superadmin/societies/new (Onboarding Wizard)
           │
 ┌─────────┴─────────┐
 │ 1. Basic Info     │ (Name, Unique Code, Registration Number, Type, Logo Upload)
 │ 2. Address        │ (Physical Address Lines, Landmark, City, State, Pincode, Country)
 │ 3. Configuration  │ (Timezone: Asia/Kolkata, Currency: INR)
 │ 4. Structure      │ (Towers/Wings count, floors per tower, units per floor)
 │ 5. Administrator  │ (Initial Administrator Name, Email, Phone, Role: SOCIETY_ADMIN)
 │ 6. Review         │ (Validation and parameter summary)
 │ 7. Commit         │ (Atomic database insertion, building setup & audit logging)
 └─────────┬─────────┘
           │
           ▼
Provisioned Society Tenant
(Isolated PostgreSQL RLS Boundary)
```

## Logo Storage Architecture
- **Bucket**: `society-assets` in Supabase Storage.
- **Path Pattern**: `logos/logo_{timestamp}_{random}.{ext}`
- **Security Policy**: Public read, write restricted to Super Admins and authenticated Society Admins.
- **Validations**: File size $\le 2\text{MB}$, MIME types `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.

## Atomic Provisioning Flow (`onboardingService.ts`)
1. Society code uniqueness check against `public.societies`.
2. Insert into `public.societies` with status `ACTIVE`.
3. Create or link Supabase Auth user for initial administrator.
4. Insert/upsert `public.profiles` for administrator.
5. Create `public.society_memberships` record granting `SOCIETY_ADMIN` role.
6. Automatically generate configured towers (`public.buildings`) and floor levels (`public.floors`).
7. Log immutable audit trail event `SOCIETY_CREATED`.

