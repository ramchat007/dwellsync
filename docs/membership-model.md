# DwellSync — Multi-Society Membership Model (Phase 1)

## Overview

The `public.society_memberships` table connects human identities (`public.profiles`) with tenant societies (`public.societies`).

## Multi-Society Relationships
A single authenticated user can belong to multiple housing societies with completely independent roles.

Example:
- User `Rahul Sharma` (`rahul@dwellsync.internal`):
  - **Green Valley CHS**: `role_id = 'RESIDENT'`, `unit_number = 'B-102'`, `status = 'ACTIVE'`
  - **Royal Heights CHS**: `role_id = 'COMMITTEE_MEMBER'`, `status = 'ACTIVE'`

## Explicit Tenant Context Resolution
- The active society tenant context is never guessed or derived from user email.
- The server checks the `dwellsync_active_society` cookie, but verifies that the user holds an `ACTIVE` membership in that society before granting access.
- When impersonating, the available tenant contexts are strictly constrained to the target user's active memberships.

## Lifecycle Statuses
- `INVITED`: Invitation sent, pending token activation.
- `ACTIVE`: Normal society access and permissions enabled.
- `SUSPENDED`: Temporarily locked out of society operations.
- `REMOVED`: Historical record retained for audit and past billing ledgers; access revoked.

