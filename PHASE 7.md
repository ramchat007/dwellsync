# DWELLSYNC — PHASE 7 MASTER IMPLEMENTATION PROMPT

## SECURITY GATE + VISITOR MANAGEMENT

You are continuing DwellSync.

Phase 6 is formally approved.

Implement ONLY Phase 7.

============================================================
OBJECTIVE
=========

Build the foundational society security/gate operation.

Conceptual architecture:

SOCIETY
↓
SECURITY PERSONNEL
↓
GATE
↓
VISITOR
↓
RESIDENT / UNIT
↓
VISIT REQUEST / ENTRY
↓
CHECK-IN
↓
CHECK-OUT

============================================================
FIRST STEP — INSPECT
====================

Before implementation inspect existing:

* security roles
* staff/personnel model
* visitor tables
* unit relationships
* resident relationships
* permissions
* RLS
* audit system
* existing notification architecture

Reuse what exists.

============================================================
SECURITY PERSONA
================

Use the existing RBAC system.

Do not create a parallel security role system.

Security personnel should receive only the permissions required for gate operations.

============================================================
VISITOR MODEL
=============

Create or extend the visitor model using real IDs.

A visitor should be associated appropriately with:

* society
* resident/unit
* visit purpose
* expected time where supported
* status
* check-in
* check-out

Do not store relationships using names.

============================================================
VISITOR WORKFLOW
================

Support the appropriate real workflow:

Resident creates/invites visitor
↓
Security sees authorized visitor information
↓
Visitor arrives
↓
Security verifies
↓
Check-in
↓
Visit active
↓
Check-out

If the existing architecture requires a different sequence, preserve it.

============================================================
SECURITY
========

Security staff must only see data relevant to their authorized society.

Residents must not gain security-admin privileges.

Security staff must not gain unrestricted platform-admin privileges.

============================================================
AUDIT
=====

Visitor actions should be auditable where the existing audit architecture supports:

VISITOR_CREATED
VISITOR_APPROVED
VISITOR_CHECKED_IN
VISITOR_CHECKED_OUT
VISITOR_CANCELLED

Do not create a duplicate audit system.

============================================================
RLS
===

Verify:

Security A → Society A → allowed

Security A → Society B → denied

Resident A → own visitor data → allowed

Resident A → unrelated resident visitor data → denied

Changing IDs must not bypass RLS.

============================================================
UI
==

Use existing DwellSync Clean Minimalism.

Create appropriate experiences for:

* resident visitor creation
* security visitor queue
* check-in
* check-out
* active visitors
* history

Do not overbuild analytics.

============================================================
TESTING
=======

Verify:

[ ] visitor creation
[ ] authorization
[ ] security queue
[ ] check-in
[ ] check-out
[ ] visitor history
[ ] role isolation
[ ] society isolation
[ ] RLS
[ ] audit events
[ ] Phase 0–6 regression

============================================================
STOP
====

Do not implement:

* maintenance billing
* accounting
* payments
* complaints
* marketplace
* advanced communication
* AI

STOP at Phase 7.

============================================================
FINAL REPORT
============

Report:

1. Status
2. Architecture reused
3. Files changed
4. Database changes
5. Visitor workflow
6. Security workflow
7. RLS
8. Audit
9. Tests
10. Build
11. Regression
12. Recommended Phase 8

STOP.
