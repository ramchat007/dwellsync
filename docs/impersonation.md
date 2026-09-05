# Super Admin Impersonation Engine

## Core Concept

Super Admin impersonation enables the platform owner to troubleshoot society issues, test permissions, and support users by operating within that user's exact context **without ever accessing or sharing user passwords**.

## Impersonation Security Principles

1. **Zero Password Disclosure**: Passwords are never requested, copied, or bypassed.
2. **Server-Side Session Control**: The server generates a cryptographically random 256-bit token stored in `public.impersonation_sessions` and sets an `httpOnly`, `SameSite=Lax`, `Secure` cookie.
3. **No Impersonation Chaining**: An impersonated user cannot impersonate another user. The system blocks nested impersonation sessions.
4. **No Privilege Escalation**: When impersonating a Resident or Society Admin, effective permissions match that persona's exact permissions.
5. **Cross-Tenant Protection**: When impersonating a Society A user, queries and navigation are strictly restricted to Society A.
6. **Persistent High-Visibility Banner**: An amber warning banner remains visible across all pages, displaying:
   - Target User Name
   - Effective Role
   - Target Society Name
   - Original Super Admin Account
   - Exit Impersonation Button
7. **Audit Logging**: Every impersonation session records `IMPERSONATION_STARTED` and `IMPERSONATION_ENDED` in `public.audit_logs`.

## Impersonation Workflow

```
Super Admin Dashboard (/superadmin/users)
  │
  ├─ Select Target User & Society Context
  ├─ Enter Audit Reason
  ▼
API /api/auth/impersonate/start
  │
  ├─ Verify Super Admin in public.platform_admins
  ├─ Verify Anti-Chaining (No active session)
  ├─ Insert row into public.impersonation_sessions
  ├─ Set HttpOnly Cookie (DwellSyncHub_impersonation_token)
  ├─ Record Audit Log (IMPERSONATION_STARTED)
  ▼
Redirect to /society/[societyId]/dashboard
  │ (Persistent Amber Banner Active)
  ▼
Click "EXIT IMPERSONATION"
  │
  ├─ API /api/auth/impersonate/exit
  ├─ Mark session as TERMINATED
  ├─ Clear HttpOnly Cookie
  ├─ Record Audit Log (IMPERSONATION_ENDED)
  ▼
Redirect to /superadmin
```
