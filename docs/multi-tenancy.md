# Multi-Tenancy Architecture

## Multi-Tenant Model

DwellSyncHub uses a **Single-Database, Shared Schema with Row-Level Security (RLS)** architecture.

```
Platform (DwellSyncHub)
├── Society A (Tenant 1)
│   ├── Units (A-101, A-102...)
│   └── Members (Admin, Secretary, Residents...)
├── Society B (Tenant 2)
└── Society C (Tenant 3)
```

## Tenant Isolation Strategy

1. **Database Level**: Every society-scoped table references `society_id UUID NOT NULL REFERENCES public.societies(id)`.
2. **PostgreSQL Row Level Security (RLS)**:
   - Policies inspect `auth.uid()` against `public.society_memberships`.
   - Users can only query rows belonging to societies where they have an active membership.
3. **Application Level**: Centralized server guards (`requireSocietyAccess(societyId)`) verify that requests to `/society/[societyId]/*` match the user's active membership before data is processed.
4. **Parameter Tampering Prevention**:
   - Supplying a forged `society_id` in URL or request body fails both at server routing and PostgreSQL RLS filters.
