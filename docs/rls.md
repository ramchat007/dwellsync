# DwellSync — Row-Level Security (RLS) Policy Specification

## RLS Enforcement Model

Every data table in DwellSync enforces PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

### Tenant Isolation Rules
1. **Direct Society Scoping**:
   - Every tenant row contains `society_id UUID NOT NULL REFERENCES public.societies(id)`.
   - Normal users can only SELECT / INSERT / UPDATE rows where `society_id` matches an active membership in `public.society_memberships`.
2. **Platform Admin Bypass**:
   - `SUPER_ADMIN` can read platform entities through service role access or explicit Super Admin policies.
3. **Cross-Tenant Prevention**:
   - A query from Society A tenant context will NEVER return rows belonging to Society B.

