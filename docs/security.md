# Security & Audit Governance

## Threat Mitigation Matrix

| Threat | Architectural Defense |
|---|---|
| Unauthorized Super Admin Access | `public.platform_admins` verification + `requireSuperAdmin()` server guards |
| Privilege Escalation under Impersonation | Effective identity computes permissions strictly from target role; Super Admin platform privileges stripped in impersonated context |
| Impersonation Chaining | Server checks for existing active session before issuing new tokens; returns HTTP 403 if already impersonating |
| Cross-Tenant Data Leaks | PostgreSQL RLS policies joined on `society_memberships` + route-level `requireSocietyAccess()` |
| Tampered Client Cookies/Payloads | Session tokens validated against `public.impersonation_sessions` database table |
| Audit Log Tampering | `public.audit_logs` has append-only RLS policies with NO UPDATE or DELETE grants |

## Audit Trail Schema

All critical operations write to `public.audit_logs`:
- `actor_user_id`: Actual user who initiated the action (original Super Admin).
- `effective_user_id`: Target user identity during impersonation.
- `society_id`: Associated society tenant (if applicable).
- `action`: Specific event enum (e.g. `SUPER_ADMIN_LOGIN`, `IMPERSONATION_STARTED`, `IMPERSONATION_ENDED`, `SOCIETY_CREATED`, `SOCIETY_SUSPENDED`, `ROLE_ASSIGNED`).
- `metadata`: Sanitized JSON payload (passwords/secrets stripped).
- `created_at`: Cryptographically accurate timestamp.
