# DwellSyncHub — People & Directory Management (Phase 1)

## Overview

The People Directory (`/society/[societyId]/people`) provides a centralized, role-categorized directory for managing all human personas associated with a housing society tenant.

## Person Categories

1. **All**: Complete society roster with real-time server-side search and filtering.
2. **Owners**: Users holding verified ownership equity in one or more units.
3. **Residents**: Occupants residing in residential apartments (owners or family members).
4. **Tenants**: Active leaseholders residing under rental agreements.
5. **Committee**: Society Admin, Secretary, Treasurer, Committee Members.
6. **Staff**: Facility Manager, Housekeeping, Maintenance Staff, Auditors.
7. **Security**: Gatekeepers and security personnel.
8. **Vendors**: External facility service contractors (Elevators, DG, Solar, Waste).

## Security Boundaries & Role Assignment
- **Super Admin Protection**: Society Admins can assign any society-level role (`COMMITTEE_MEMBER`, `SECRETARY`, `TREASURER`, `MANAGER`, `RESIDENT`, `OWNER`, `TENANT`, `SECURITY`, `STAFF`, `VENDOR`, `AUDITOR`), but are **strictly prevented** from assigning `SUPER_ADMIN` or altering platform-level administrator tables.
- **Invitation Architecture**:
  - Invitations are generated with 256-bit cryptographic tokens expiring in 7 days.
  - Stored in `public.invitations` with status `PENDING`, `ACCEPTED`, `EXPIRED`, or `REVOKED`.

