# DwellSync — Physical Unit Model & Bulk Generation (Phase 1)

## Overview

Units represent individual apartments, penthouses, commercial shops, offices, or parking bays within a housing society building.

## Schema Definition (`public.units`)
- `id UUID PRIMARY KEY`: Immutable unit identifier.
- `society_id UUID`: Multi-tenant boundary.
- `building_id UUID`: Parent building/tower.
- `wing_id UUID`: Optional building wing/block.
- `floor_id UUID`: Optional floor level reference.
- `unit_number TEXT`: Display unit number (e.g. `A-101`, `B-204`, `SHOP-01`).
- `unit_type TEXT`: `1_BHK`, `2_BHK`, `3_BHK`, `4_BHK`, `PENTHOUSE`, `SHOP`, `OFFICE`, `PARKING`, `OTHER`.
- `area_sqft NUMERIC(10,2)`: Total area in square feet.
- `status TEXT`: `ACTIVE`, `VACANT`, `OCCUPIED`, `UNDER_MAINTENANCE`, `INACTIVE`.

## Bulk Unit Generation Engine (`unitBatchService.ts`)
The bulk generation engine allows society administrators to create dozens or hundreds of units in seconds:
- **Pattern**: `{prefix}{floor}{unit}` (e.g. `A-101`, `A-102`...).
- **Floor Range**: `start_floor` to `end_floor` (supporting Basement `-1`, Ground `0`, Floors `1..N`).
- **Units per Floor**: Configurable unit count per level.
- **Interactive Preview**: Administrators can review, adjust unit types/areas, or delete individual rows before batch commit.
- **Batch Insertion**: Single optimized database transaction.

