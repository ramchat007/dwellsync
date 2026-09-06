# DWELLSYNC — PHASE 11 MASTER IMPLEMENTATION PROMPT

## GOVERNANCE & ADMINISTRATION

**Execution Environment:** Antigravity
**Product:** DwellSync
**Phase:** 11
**Phase Name:** Governance & Administration
**Mode:** Production implementation
**Database:** Existing connected Supabase/PostgreSQL database
**Framework:** Existing Next.js App Router application

---

# 1. MISSION

Implement **Phase 11 — Governance & Administration**.

This phase provides controlled administration of:

* Committee members
* Society administrators
* Roles
* Permissions
* Approval workflows
* Society configuration
* Governance controls
* Delegation
* Role transitions
* Audit logs

The existing identity, RBAC, permission, society, RLS, and audit architecture remains authoritative.

---

# 2. CRITICAL SUPER_ADMIN RULE

This is NON-NEGOTIABLE:

> **SUPER_ADMIN remains a platform-level role. SUPER_ADMIN must never become a shortcut around society RLS or society authorization.**

Do not implement:

```text
SUPER_ADMIN → bypass all society security
```

Instead:

```text
Platform Administration
        ↓
Platform-level controls

Society Administration
        ↓
Society-scoped authorization
        ↓
Society RLS
```

Any cross-society administrative action must use an explicit, audited, platform-level architecture if such functionality is genuinely required.

Do not silently bypass RLS.

---

# 3. EXECUTION ORDER

```text
PHASE 11.0 — Governance Architecture Audit
        ↓
PHASE 11.1 — Existing RBAC / Permission Gap Analysis
        ↓
PHASE 11.2 — Governance Architecture Plan
        ↓
PHASE 11.3 — Committee / Admin Management
        ↓
PHASE 11.4 — Role / Permission Administration
        ↓
PHASE 11.5 — Approval Workflows
        ↓
PHASE 11.6 — Society Configuration
        ↓
PHASE 11.7 — Delegation / Role Transitions
        ↓
PHASE 11.8 — Security / RLS / Audit Testing
        ↓
PHASE 11.9 — Regression / Production Build
        ↓
PHASE 11.10 — Final Report
        ↓
STRICT STOP
```

---

# 4. EXISTING RBAC IS AUTHORITATIVE

Do not create a second role engine.

Inspect and reuse:

* Existing roles
* Existing permissions
* Existing role-permission relationships
* Existing membership architecture
* Existing `getCurrentIdentity()`
* Existing permission checks
* Existing audit system
* Existing RLS

Only add missing roles/permissions when justified.

---

# 5. COMMITTEE / ADMIN MANAGEMENT

Support authorized management of society administration.

Potential capabilities:

* View committee
* Add committee member
* Assign administrative responsibility
* Activate/deactivate membership
* Update administrative designation
* View current office bearers
* Preserve historical records

Do not destroy historical governance records merely because someone is no longer active.

Use effective dates/status where appropriate.

---

# 6. ROLE ASSIGNMENT

Allow authorized administrators to assign permitted society roles.

Examples:

* Society Admin
* Secretary
* Manager
* Committee member
* Other roles already supported by the architecture

Do not permit:

* Resident self-promotion
* Security self-promotion
* Arbitrary role IDs from the browser
* Client-side privilege escalation

Every role assignment must be validated server-side.

---

# 7. PERMISSION ADMINISTRATION

Reuse the existing permission engine.

Support viewing and managing permissions according to the established architecture.

Do not let ordinary society administrators grant themselves unrestricted platform permissions.

Permission changes must be auditable.

---

# 8. APPROVAL WORKFLOWS

Where sensitive administrative actions require approval, implement controlled workflows.

Possible examples:

```text
Requested
    ↓
Pending Approval
    ↓
Approved / Rejected
```

Potential actions:

* Role assignment
* Committee changes
* Configuration changes
* Other sensitive governance actions

Do not implement approval as a client-only flag.

Server-side authorization is mandatory.

---

# 9. SOCIETY CONFIGURATION

Provide authorized management of society settings.

Potential configuration:

* Society name
* Contact details
* Address
* Registration information
* Operational settings
* Society preferences
* Relevant resident-facing configuration

Do not allow administrators to modify:

* Their own authorization beyond permitted workflows
* Platform roles
* Another society's settings
* System security configuration
* RLS policies through UI

---

# 10. GOVERNANCE CONTROLS

Implement governance controls appropriate to the existing schema.

Examples:

* Active/inactive committee membership
* Role effective dates
* Delegated authority
* Approval requirements
* Administrative responsibilities
* Governance history

Maintain historical auditability.

---

# 11. ADMINISTRATIVE DELEGATION

If delegation is implemented, it must be:

* Explicit
* Time-bounded where appropriate
* Scope-limited
* Auditable
* Reversible
* Server-authorized

Example:

```text
Administrator A
       ↓
Delegates specific responsibility
       ↓
Administrator B
       ↓
Only approved permissions become active
```

Do not implement unrestricted impersonation.

---

# 12. SECURE ROLE TRANSITIONS

Role transitions must be server-authoritative.

Examples:

```text
Resident → Committee Member
Resident → Society Admin
Committee Member → Secretary
Admin → Inactive
```

Validate:

* Current actor's authority
* Target user's membership
* Society
* Requested role
* Permission to assign that role
* Existing constraints
* Audit event

Never allow arbitrary role transitions through payload manipulation.

---

# 13. AUDIT LOGS

Governance actions require strong auditability.

Audit:

* Role assignment
* Role removal
* Permission changes
* Committee changes
* Delegation
* Approval
* Rejection
* Configuration changes
* Administrative status changes

Include actor, target, society, timestamp, action, and relevant metadata without storing unnecessary sensitive information.

---

# 14. RLS

Test:

### Society Admin

Can manage:

* Authorized governance within own society

Cannot:

* Access another society

### Committee Member

Only receives explicitly authorized capabilities.

### Resident

Cannot:

* Assign roles
* Modify permissions
* Modify committee
* Modify society governance

### SUPER_ADMIN

Remains platform-level.

Do not weaken society RLS merely because SUPER_ADMIN exists.

---

# 15. URL / PAYLOAD TAMPERING

Explicitly test:

```text
Foreign society_id
Foreign user_id
Foreign membership_id
Foreign role_id
Foreign permission_id
Modified approval ID
Modified delegation ID
```

All must be rejected when unauthorized.

---

# 16. SELF-ESCALATION TESTS

Explicitly test attacks such as:

```text
Resident submits role = SOCIETY_ADMIN
Resident submits permission = *
Resident submits society_id = another society
Society admin submits role = SUPER_ADMIN
User modifies another user's membership
User modifies another society's configuration
```

All must fail.

---

# 17. UI / UX

Create appropriate governance/admin interfaces.

Provide:

* Committee management
* Role management
* Permission visibility
* Approval queues
* Society configuration
* Delegation
* Audit visibility

Follow Clean Minimalism.

Use clear warnings for destructive/sensitive actions.

Provide confirmation workflows.

---

# 18. TESTING

Create Phase 11 tests covering:

### Roles

* Authorized assignment
* Unauthorized assignment
* Removal
* Status transitions

### Permissions

* Permission enforcement
* Permission modification
* Self-escalation prevention

### Committee

* Add
* Update
* Deactivate
* History

### Approvals

* Request
* Approve
* Reject
* Unauthorized approval

### Delegation

* Create
* Scope
* Expiration
* Revoke

### Society Configuration

* Update
* Authorization
* Cross-society isolation

### Audit

* Governance actions logged

### Security

* RLS
* RBAC
* Payload tampering
* URL tampering
* Tenant isolation

---

# 19. REGRESSION

Run all previous phases.

Verify:

* Authentication
* Resident identity
* Resident portal
* Visitor management
* Society operations
* Maintenance/billing
* Notifications
* RBAC
* RLS
* Audit

Run:

```text
tests
typecheck
lint
production build
```

using actual project commands.

---

# 20. HARD STOP

Do NOT implement:

* Analytics
* Production-hardening program
* New business modules
* Financial redesign
* New notification providers

Stop after Phase 11.

---

# 21. FINAL REPORT

Return:

# DWELLSYNC — PHASE 11 COMPLETION REPORT

Include:

1. Status
2. Governance architecture audit
3. Existing RBAC reused
4. Roles
5. Permissions
6. Committee management
7. Admin management
8. Approval workflows
9. Society configuration
10. Delegation
11. Role transitions
12. SUPER_ADMIN boundary
13. RLS
14. Security threat-vector review
15. Audit trail
16. Tests
17. Regression results
18. TypeScript
19. ESLint
20. Production build
21. Files created
22. Files modified
23. Known limitations
24. Manual QA instructions
25. Confirmation that SUPER_ADMIN does not bypass society RLS
26. Confirmation that Phase 12 was NOT implemented

End with:

**PHASE 11 COMPLETE — STRICT STOP CONDITION MET.**

Do not proceed to Phase 12 without explicit approval.
