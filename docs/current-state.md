# DwellSyncHub — Current State Inspection (Pre-Phase 0 Baseline)

## Inspection Summary

This document captures the exact architectural, security, database, and application state established during PRE-PHASE 0 before the implementation of PHASE 0.

---

## 1. Technology Stack & Dependencies

- **Framework**: Next.js 15.1.7 (App Router) with React 19.0.0
- **Language**: TypeScript 5.7.3 (`strict: true`)
- **Styling**: Tailwind CSS 3.4.17, `tailwindcss-animate`, CSS custom variables
- **Icons**: Lucide React 0.475.0
- **Validation**: Zod 3.24.2, `@hookform/resolvers` 3.9.1, `react-hook-form` 7.54.2
- **Database & Auth**: Supabase PostgreSQL, `@supabase/ssr` 0.5.2, `@supabase/supabase-js` 2.48.1
- **Testing**: Vitest 3.0.5 (17/17 security tests passing)
- **Runtime Scripts**: `tsx` 4.19.2

---

## 2. Existing Database Schema & Migrations

### Tables Defined (`supabase/migrations/20260901000001_initial_schema.sql`):
1. `profiles`: Maps directly to `auth.users(id)` via `handle_new_user()` trigger.
2. `societies`: Multi-tenant housing society entity (`id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `status`).
3. `roles`: 13 system roles (`SUPER_ADMIN`, `SOCIETY_ADMIN`, `COMMITTEE_MEMBER`, `SECRETARY`, `TREASURER`, `MANAGER`, `RESIDENT`, `OWNER`, `TENANT`, `SECURITY`, `STAFF`, `VENDOR`, `AUDITOR`).
4. `permissions`: Granular capability catalog across platform, society, billing, etc.
5. `role_permissions`: Join table for default role-to-permission mappings.
6. `society_memberships`: Maps user profile to society tenant and role.
7. `platform_admins`: Tracks verified platform-level Super Admins.
8. `impersonation_sessions`: Records server-controlled impersonation sessions with 256-bit crypto tokens and timestamps.
9. `audit_logs`: Immutable, append-only log storing actor, effective user, society context, event type, and sanitized metadata.

### Row Level Security (`supabase/migrations/20260901000002_rls_policies.sql`):
- All 9 tables have RLS enabled with helper functions `is_super_admin()` and `has_society_role()`.
- Tenant isolation enforced on `societies` and `society_memberships`.
- `audit_logs` has append-only policy with no UPDATE or DELETE grants.

---

## 3. Existing Authentication & Authorization Architecture

- **Identity Resolution**: `getCurrentIdentity()` in `src/lib/auth/server.ts` parses cookies and resolves `originalUser` vs `effectiveUser`.
- **Server Guards**:
  - `requireAuth()`
  - `requireSuperAdmin()`
  - `requireSocietyAccess(societyId)`
  - `requirePermission(permission)`
- **Client Auth Context**: `useAuth()` hook in `src/lib/auth/client.tsx` exposes role, permissions, and impersonation status.
- **Impersonation Engine**: `src/lib/auth/impersonation.ts` enforces anti-chaining, generates cryptographically random tokens, sets HttpOnly cookies, de-escalates permissions, and logs audit events.
- **Impersonation UI**: Persistent top amber warning banner (`ImpersonationBanner.tsx`) with 1-click exit and floating debug inspector (`SuperAdminDebugPanel.tsx`).

---

## 4. Gaps to be Addressed in Phase 0

1. **Enhanced Society Model**: Add comprehensive fields (`registration_number`, `society_type`, `logo_url`, `district`, `country`, `contact_email`, `contact_phone`, `website`, `timezone`, `currency`, `created_by`, `updated_by`, statuses: `ONBOARDING`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`).
2. **Physical Hierarchy Models**:
   - `buildings` (`society_id`, `name`, `code`, `number_of_floors`, `status`)
   - `wings` (`society_id`, `building_id`, `name`, `code`, `status`)
   - `floors` (`society_id`, `building_id`, `wing_id` (nullable), `name`, `floor_number`, `display_order`, `status`)
   - `units` (`society_id`, `building_id`, `wing_id` (nullable), `floor_id` (nullable), `unit_number`, `unit_type`, `area_sqft`, `carpet_area_sqft`, `built_up_area_sqft`, `status`)
3. **Application Shell & UI Design System**:
   - Full suite of standard UI components (`Select`, `Textarea`, `Drawer`/Sheet, `Dropdown`, `Tabs`, `Alert`, `Toast`, `Pagination`, `Avatar`, `Tooltip`, `Skeleton`).
   - Reusable `AppShell`, `Sidebar`, `MobileSidebar`, `Topbar`, `Breadcrumbs`, `PageHeader`, `UserMenu`, `SocietySwitcher`.
4. **Current Society Context & Multi-Society Switching**:
   - Server-validated society switcher allowing users with multiple society memberships to switch active tenant context.
5. **Storage Architecture**:
   - Supabase Storage bucket configurations and security policies for `society-assets` and `profile-images`.
6. **Zod Validation Service Layer**:
   - Strict schemas for societies, buildings, wings, floors, units, and memberships.
7. **Expanded Test Suite**:
   - Comprehensive unit and integration tests for multi-tenant physical hierarchy, society switching, storage, and E2E impersonation & tenant isolation flows.

