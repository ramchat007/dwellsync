# DwellSync — System Architecture

## Product Philosophy
"Every Rupee. Every Task. Every Decision. Accountable."

DwellSync is a multi-tenant housing society operating system engineered with multi-layer boundaries across database, authorization, and UI presentation layers.

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15 App Router                     │
├──────────────────────────────┬──────────────────────────────┤
│  Super Admin Platform Layer  │     Tenant Society Layer     │
│    (/superadmin/*)           │     (/society/[societyId]/*) │
├──────────────────────────────┴──────────────────────────────┤
│                Middleware & Authorization                   │
│   (Session Cookie + Server Token Validation + RBAC Map)     │
├─────────────────────────────────────────────────────────────┤
│                 Supabase PostgreSQL 16                      │
│      (Row-Level Security + Multi-Tenant Boundaries)         │
└─────────────────────────────────────────────────────────────┘
```

## Security Tiers
1. **Platform Owner (`SUPER_ADMIN`)**:
   - Manages society tenant lifecycle.
   - Audited cryptographic impersonation sessions.
2. **Society Administrator (`SOCIETY_ADMIN`, `SECRETARY`, `TREASURER`)**:
   - Confined strictly to their active society boundary.
   - Manages physical buildings, units, members, and society operations.
3. **Residents & Occupants (`OWNER`, `RESIDENT`, `TENANT`)**:
   - Access limited to their assigned apartments and public society announcements.
4. **Operations & Security Staff (`MANAGER`, `SECURITY`, `STAFF`, `VENDOR`)**:
   - Task-specific restricted interfaces.

