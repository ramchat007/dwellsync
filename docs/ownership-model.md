# DwellSyncHub — Multi-Owner & Joint Ownership Model (Phase 1)

## Overview

In Indian housing societies, apartments and commercial units frequently have joint ownership (e.g. husband and wife, multiple partners, family shares). DwellSyncHub decouples unit records from single-owner foreign keys into a dedicated `public.unit_owners` relationship table.

## Data Model (`public.unit_owners`)

```sql
CREATE TABLE public.unit_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  ownership_percentage NUMERIC(5, 2) DEFAULT 100.00 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100.00),
  ownership_type TEXT NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY', 'JOINT', 'INHERITED', 'CORPORATE', 'OTHER'
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'HISTORICAL', 'DISPUTED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_owner UNIQUE (unit_id, user_id)
);
```

## Validation & Business Rules
1. **Total Equity Cap ($\le 100\%$)**: The sum of all active `ownership_percentage` values for a single unit cannot exceed $100.00\%$.
2. **Primary vs. Joint Ownership**: Each unit can have one primary owner (`is_primary = true`) who receives primary society voting notices and official billing communications.
3. **Historical Equity Tracking**: When an owner sells or transfers equity, the record status is set to `HISTORICAL` with an `end_date` rather than hard-deleting the transaction history.

