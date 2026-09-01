# DwellSync — Occupancy & Tenant Model (Phase 1)

## Overview

DwellSync explicitly distinguishes between **Property Ownership** and **Physical Occupancy**. A property owner may live elsewhere (e.g. NRI or investor), while the apartment is occupied by a tenant, a family member, or remains vacant.

## Data Model (`public.unit_occupancies`)

```sql
CREATE TABLE public.unit_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupancy_type TEXT NOT NULL DEFAULT 'TENANT_OCCUPIED', -- 'OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'FAMILY_OCCUPIED'
  lease_start DATE,
  lease_end DATE,
  is_primary_tenant BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'TERMINATED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_active_occupant UNIQUE (unit_id, user_id)
);
```

## Household & Family Members (`public.family_members`)
- Records family members (Spouse, Child, Parent, Sibling) residing with the primary occupant.
- Captures emergency contacts and phone numbers without granting administrative permissions to children or dependents.

## Contradictory State Prevention
- When an active tenant or resident occupancy is created for a unit, the unit's status is automatically updated to `OCCUPIED`.
- A unit cannot be marked `VACANT` if active occupant records remain in `public.unit_occupancies`.

