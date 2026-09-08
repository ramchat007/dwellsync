IMPLEMENT PHASE 13 ONLY — BUILDER HANDOVER & NEW SOCIETY HANDOVER MANAGEMENT

PROJECT: DwellSync
STACK: Next.js App Router + Supabase/PostgreSQL + existing DwellSync architecture

IMPORTANT WORKFLOW RULES:

* Implement ONLY Phase 13.
* Do NOT implement Phase 14 or any later phase.
* Do NOT run the complete historical test suite.
* Do NOT perform a full historical security audit.
* Do NOT perform Git status/commit/push operations.
* Do NOT repeat previous phase audits.
* Reuse the existing DwellSync authentication, identity, tenant isolation, RBAC, RLS, audit-log, validation, notification and UI architecture.
* Do not create mock data, fake APIs, placeholder functionality, or simulated production workflows.
* If database changes are required, create a LOCAL Supabase migration file only. Do NOT execute the migration against the remote Supabase database.
* Stop after Phase 13 implementation and provide a concise implementation report.

==================================================
PHASE 13
BUILDER HANDOVER & NEW SOCIETY HANDOVER MANAGEMENT
==================================================

PRIMARY OBJECTIVE

Build a production-ready handover management foundation for newly formed housing societies where the builder/developer transfers the society's physical assets, documents, statutory records, pending works, warranties, AMCs, vendors and responsibilities to the society/committee/authorized management.

The module must support a structured, auditable transition from:

BUILDER / DEVELOPER
↓
SOCIETY / COMMITTEE / AUTHORIZED MANAGEMENT

This must be tenant-isolated and integrated with the existing DwellSync architecture.

==================================================

1. HANDOVER PROJECT
   ==================================================

Create a handover workspace/project associated with a society.

A handover project should support:

* Society
* Project name/title
* Builder/developer name
* Builder contact details
* Handover start date
* Target handover date
* Actual handover date
* Status
* Overall progress
* Description/notes
* Created by
* Updated by
* Created/updated timestamps

Suggested lifecycle:

DRAFT
→ IN_PROGRESS
→ UNDER_REVIEW
→ READY_FOR_HANDOVER
→ HANDOVER_COMPLETED
→ CLOSED

Allow CANCELLED where appropriate.

Do not allow arbitrary lifecycle jumps if the existing architecture supports state validation.

==================================================
2. HANDOVER CHECKLIST
=====================

Create a structured checklist system.

Each checklist item should support:

* Category
* Title
* Description
* Priority
* Status
* Responsible person
* Builder responsibility flag
* Society responsibility flag
* Due date
* Completed date
* Notes
* Evidence/document references
* Created/updated timestamps

Suggested statuses:

PENDING
IN_PROGRESS
COMPLETED
NOT_APPLICABLE
BLOCKED

Suggested priorities:

LOW
MEDIUM
HIGH
CRITICAL

Categories should include at minimum:

* LEGAL
* STATUTORY
* BUILDING
* ELECTRICAL
* PLUMBING
* WATER
* FIRE_SAFETY
* LIFT
* SECURITY
* COMMON_AREAS
* PARKING
* LANDSCAPING
* AMENITIES
* METERS
* ASSETS
* VENDORS
* AMC
* DOCUMENTATION
* DEFECTS
* OTHER

==================================================
3. DEFECT / PUNCH LIST
======================

Provide a dedicated handover defect/punch-list capability.

Each defect should support:

* Society
* Handover project
* Location/building/wing/unit where applicable
* Category
* Title
* Description
* Severity
* Reported date
* Builder responsibility
* Assigned person
* Target resolution date
* Status
* Resolution notes
* Evidence
* Resolved date

Suggested severity:

LOW
MEDIUM
HIGH
CRITICAL

Suggested lifecycle:

OPEN
ASSIGNED
IN_PROGRESS
PENDING_BUILDER
RESOLVED
VERIFIED
CLOSED

Do not allow a defect to become CLOSED without appropriate verification where the authorization model requires it.

==================================================
4. BUILDER COMMITMENTS / PENDING WORKS
======================================

Create a mechanism to track builder commitments.

Each commitment should support:

* Commitment title
* Description
* Category
* Builder
* Responsible person
* Target date
* Status
* Priority
* Notes
* Evidence
* Completion date
* Verification status

This must make it possible for society management to clearly see:

* What builder promised
* What is pending
* Who is responsible
* What is overdue
* What has been completed
* What still requires verification

==================================================
5. STATUTORY & COMPLIANCE RECORDS
=================================

Provide structured tracking for important statutory/compliance documents.

Examples:

* Occupancy Certificate
* Completion Certificate
* Fire Safety Certificate
* Lift certificates
* Electrical approvals
* Water-related approvals
* Pollution/environment-related approvals where applicable
* Property/land-related records
* Other statutory approvals

Each record should support:

* Document type
* Document number/reference
* Issuing authority
* Issue date
* Expiry date where applicable
* Status
* Document reference
* Notes

Where an expiry date exists, the data must be structured so Phase 12 analytics can later identify upcoming expirations.

Do NOT hard-code specific legal requirements for every jurisdiction.

==================================================
6. ASSET HANDOVER
=================

Create an asset handover foundation for common-society assets.

Examples:

* Pumps
* DG sets
* Transformers
* Lifts
* Fire equipment
* CCTV systems
* Access-control equipment
* Gym equipment
* Clubhouse equipment
* Garden equipment
* Electrical infrastructure
* Water infrastructure

Each asset should support:

* Asset name
* Category
* Location
* Manufacturer
* Model
* Serial number
* Installation date
* Warranty start/end
* Current condition
* Handover status
* Builder/vendor
* Documents
* Notes

Do not duplicate the complete future Assets & Maintenance module unnecessarily. Build the handover-specific foundation and integration points required for future expansion.

==================================================
7. AMC / WARRANTY HANDOVER
==========================

Create structured handover records for:

* AMCs
* Warranties
* Service contracts
* Vendor contracts

Support:

* Asset/service
* Vendor
* Contract type
* Start date
* End date
* Renewal date where applicable
* Contact person
* Contact information
* Contract document
* Status
* Notes

This data must be structured for future analytics such as:

"3 AMCs expire within 30 days"

Do not implement the Phase 12 analytics feature again.

==================================================
8. METERS & READINGS
====================

Provide handover records for relevant meters/infrastructure readings.

Support:

* Meter type
* Meter number
* Location
* Building/wing/unit where applicable
* Handover reading
* Reading date
* Unit of measurement
* Notes
* Evidence

Do not build a complete utility billing system in this phase.

==================================================
9. DOCUMENT HANDOVER
====================

Integrate with the existing DwellSync document architecture where available.

Do NOT create an unrelated second document storage system.

Handover documents should be categorized and linked to the relevant:

* Handover project
* Checklist item
* Defect
* Asset
* Compliance record
* AMC/warranty
* Builder commitment

Respect existing document storage, authorization and tenant isolation.

==================================================
10. HANDOVER MEETINGS / PROCEEDINGS
===================================

Integrate with the existing governance/meeting infrastructure where appropriate.

A handover meeting should be able to reference:

* Handover project
* Date/time
* Participants
* Agenda
* Minutes
* Decisions
* Action items

Reuse existing meeting/proceedings architecture instead of creating duplicate meeting infrastructure.

Do NOT implement AI-generated MOM in this phase.

==================================================
11. HANDOVER ACCEPTANCE
=======================

Provide a controlled final handover workflow.

The society should be able to move toward:

READY_FOR_HANDOVER
→ HANDOVER_COMPLETED
→ CLOSED

Before final completion, enforce appropriate business validations such as:

* Required checklist items reviewed
* Critical defects handled or explicitly acknowledged
* Required handover documents recorded
* Assets reviewed
* Outstanding builder commitments clearly identified

Do not invent legal requirements.

The system must preserve outstanding items rather than silently marking them complete.

==================================================
12. ROLES & AUTHORIZATION
=========================

Integrate with the existing DwellSync RBAC system.

At minimum:

SUPER_ADMIN:

* Platform-level administrative visibility according to existing tenant-context rules.
* Must not bypass tenant isolation simply because the user is SUPER_ADMIN.

SOCIETY_ADMIN:

* Full society-level handover management.

SECRETARY / AUTHORIZED COMMITTEE MANAGEMENT:

* Manage/review handover according to existing governance permissions.

TREASURER:

* Only relevant access where required by existing authorization model.

RESIDENT / OWNER / TENANT:

* No management permissions.
* May receive limited transparency/read-only information only where explicitly authorized by the existing society model.

SECURITY / STAFF / VENDOR:

* Deny access unless a specific existing role/permission is intentionally granted.

Do not create broad role bypasses.

Prefer explicit permissions such as:

HANDOVER_VIEW
HANDOVER_MANAGE
HANDOVER_APPROVE

or the project's existing permission naming convention.

Do not duplicate permission systems.

==================================================
13. TENANT ISOLATION
====================

Every handover-related resource must be associated with society_id.

Enforce tenant isolation at:

* API/service layer
* authorization layer
* database/RLS layer

Child records must not be able to reference a parent belonging to another society.

Use UUID foreign keys and composite tenant-safe relationships where appropriate.

Never use:

* society name
* builder name
* email
* display name

as relational identifiers.

Reuse existing tenant-context helpers such as:

identity.currentSociety.id
identity.effectiveUser.id
requireSocietyAccess

and existing RLS patterns.

==================================================
14. AUDIT LOGGING
=================

All important handover actions must be auditable.

Examples:

* Handover created
* Handover status changed
* Checklist created/updated/completed
* Defect created/assigned/resolved/verified
* Builder commitment created/updated/completed
* Compliance record added/updated
* Asset added/updated
* AMC/warranty added/updated
* Final handover approval/completion

Reuse:

recordAuditLog()

Do not create a second audit system.

==================================================
15. NOTIFICATIONS
=================

Reuse the existing Phase 10 notification infrastructure.

Examples of future-ready notification events:

* Checklist item assigned
* Checklist item overdue
* Critical defect assigned
* Builder commitment approaching deadline
* Builder commitment overdue
* AMC/warranty approaching expiry
* Handover requiring review
* Handover ready for acceptance

Do not implement external WhatsApp/SMS/email provider integrations.

Use the existing notification abstraction.

==================================================
16. UI / UX
===========

Create a clean, production-ready Handover workspace.

Suggested structure:

Handover Dashboard

KPI cards:

* Overall completion %
* Open critical defects
* Pending builder commitments
* Documents pending
* Expiring AMCs / warranties
* Overdue checklist items

Sections/tabs:

1. Overview
2. Checklist
3. Defects
4. Builder Commitments
5. Documents
6. Compliance
7. Assets
8. AMCs & Warranties
9. Meters
10. Meetings
11. Acceptance / Closure

Use the existing DwellSync Clean Minimalism design language.

Responsive desktop/tablet/mobile layouts.

Avoid unnecessary redesign of the existing application shell.

==================================================
17. API / SERVICE ARCHITECTURE
==============================

Use the existing DwellSync service/API conventions.

Implement proper:

* Authentication
* Tenant authorization
* Permission checks
* Input validation
* UUID validation
* Error handling
* Consistent HTTP responses
* Audit logging

Use Zod or the existing validation infrastructure.

Do not expose unnecessary fields in API responses.

Do not trust society_id supplied by clients when the authenticated tenant context can determine it.

==================================================
18. DATABASE / MIGRATION
========================

If database tables are required, create:

supabase/migrations/20260901000015_phase13_builder_handover.sql

Use production-safe SQL.

Requirements:

* UUID primary keys
* society_id tenant ownership
* appropriate foreign keys
* tenant-safe composite foreign keys where required
* timestamps
* sensible CHECK constraints
* indexes for common access patterns
* RLS policies
* no destructive changes
* no duplicate existing tables
* no duplicate document/meeting/audit infrastructure

Before creating a table, inspect the existing schema and reuse existing entities where appropriate.

==================================================
19. SECURITY REQUIREMENTS
=========================

Prevent:

* Cross-society access
* IDOR through handover IDs
* Child-record cross-tenant access
* Unauthorized checklist updates
* Unauthorized defect closure
* Unauthorized final handover completion
* Mass assignment of protected fields
* Client-controlled society ownership
* Unauthorized document access

Never trust:

society_id
created_by
approved_by
completed_by
tenant context
role

when those values can be derived from the authenticated context.

==================================================
20. PHASE 12 INTEGRATION
========================

The new handover domain should be structured so existing Phase 12 analytics can eventually consume:

* handover progress
* overdue checklist items
* critical defects
* pending builder commitments
* compliance expiry dates
* AMC/warranty expiry dates
* asset handover status

Do not rebuild the analytics dashboard in this phase.

==================================================
21. OUT OF SCOPE
================

DO NOT implement:

* Digital AGM
* Voting/ballots
* Elections
* AI Meeting Assistant
* AI-generated MOM
* Pricing/subscription system
* Property-management-company multi-society management
* WhatsApp conversational workflows
* Language localization
* Migration service
* Discussion → task automation
* Complete asset maintenance system
* Complete security guard application
* New payment gateway
* Mobile application
* Major application redesign

These belong to later phases.

==================================================
22. IMPLEMENTATION QUALITY
==========================

Before finishing:

* Verify TypeScript compilation for changed code.
* Verify lint for changed code.
* Verify the Phase 13 implementation-specific checks/tests you create.
* Do NOT run the entire historical test suite.
* Do NOT perform the complete application security audit.
* Do NOT inspect or report Git status.
* Do NOT execute remote Supabase migrations.

If a migration is created, report its exact filename and state that it is LOCAL ONLY.

==================================================
FINAL REPORT FORMAT
===================

When implementation is complete, report only:

1. Phase 13 status
2. What was implemented
3. Database migration filename, if created
4. Implementation-specific test/check result
5. TypeScript/lint result
6. Any blockers or important findings
7. Files changed/created

Then STOP.

Do not start Phase 14.
