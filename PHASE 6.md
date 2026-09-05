# DWELLSYNC — PHASE 6 MASTER IMPLEMENTATION PROMPT

## RESIDENT PORTAL FOUNDATION

You are continuing the existing DwellSync application.

Phase 5 has been formally approved.

Implement ONLY Phase 6.

Do not rebuild previous phases.

============================================================
OBJECTIVE
=========

Create the first real resident-facing application experience.

The flow must be:

AUTHENTICATED RESIDENT
↓
RESIDENT CONTEXT
↓
SOCIETY
↓
UNIT
↓
RESIDENT DASHBOARD

The dashboard must use real database data.

============================================================
PRESERVE
========

Preserve:

* authentication
* identity
* roles
* permissions
* society context
* unit context
* RLS
* UUID relationships
* Clean Minimalism UI
* Phase 5 resident onboarding

============================================================
RESIDENT DASHBOARD
==================

Create the foundational resident dashboard.

Potential sections:

* resident profile
* society information
* unit information
* household summary
* important notices
* quick actions
* relevant society information

Only implement functionality supported by the existing schema.

Do not populate sections with fake data.

Empty states are preferable to fake data.

============================================================
RESIDENT CONTEXT
================

The dashboard must resolve:

Authenticated User
↓
Resident
↓
Society Membership
↓
Unit
↓
Authorized Data

Do not derive unit access from URL parameters alone.

============================================================
ROLE BEHAVIOR
=============

Different roles must see only the functionality they are authorized to see.

Do not hardcode UI visibility as the only security mechanism.

Backend authorization and RLS remain authoritative.

============================================================
PROFILE
=======

Allow residents to view their profile.

Allow editing only fields that the existing domain model permits.

Do not allow a resident to modify:

* society ownership
* role
* permissions
* tenant context
* arbitrary unit relationships

============================================================
UNIT INFORMATION
================

Display relevant unit information using real relationships:

Society
→ Building
→ Wing
→ Floor
→ Unit

Do not use hardcoded hierarchy.

============================================================
EMPTY / LOADING / ERROR STATES
==============================

Implement proper:

* loading
* empty
* error
* unauthorized
* offline/network failure

states.

============================================================
SECURITY TESTING
================

Verify:

[ ] resident can access own context
[ ] resident cannot access another society
[ ] resident cannot access unrelated unit
[ ] URL manipulation fails
[ ] request payload manipulation fails
[ ] role manipulation fails
[ ] RLS remains active

============================================================
REGRESSION
==========

All Phase 0–5 tests must continue passing.

Do not weaken an existing security test.

============================================================
STOP CONDITION
==============

Do not implement:

* visitor management
* security gate
* complaints
* payments
* accounting
* notifications
* WhatsApp
* advanced analytics

Those belong to later phases.

============================================================
FINAL REPORT
============

Report:

1. Status
2. Files changed
3. Database changes
4. Resident dashboard
5. Resident context
6. Security
7. Tests
8. Build
9. Regression
10. Known issues
11. Recommended Phase 7

STOP.
