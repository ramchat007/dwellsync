# DWELLSYNC — PHASE 9 MASTER IMPLEMENTATION PROMPT

## MAINTENANCE & BILLING

**Execution Environment:** Antigravity
**Product:** DwellSync
**Phase:** 9
**Phase Name:** Maintenance & Billing
**Mode:** Production implementation
**Database:** Existing connected Supabase/PostgreSQL database
**Framework:** Existing Next.js App Router application

---

# 1. MISSION

Implement **Phase 9 — Maintenance & Billing**.

This phase introduces society maintenance-charge configuration, billing cycles, invoices, resident dues, receipts, payment status, manual payment recording, and a payment-provider abstraction.

This phase must extend the existing DwellSync architecture.

Do not redesign:

* Authentication
* Identity
* Society context
* RBAC
* Permissions
* RLS
* Resident/unit relationships
* Audit
* Notification architecture

---

# 2. EXECUTION ORDER

```text
PHASE 9.0 — Workspace & Financial Schema Audit
        ↓
PHASE 9.1 — Financial Architecture & Gap Analysis
        ↓
PHASE 9.2 — Approved Implementation Plan
        ↓
PHASE 9.3 — Database / Backend Implementation
        ↓
PHASE 9.4 — Billing UI
        ↓
PHASE 9.5 — Financial Security / RLS Testing
        ↓
PHASE 9.6 — Financial Workflow Testing
        ↓
PHASE 9.7 — Regression / Production Build
        ↓
PHASE 9.8 — Final Phase 9 Report
        ↓
STRICT STOP
```

Inspect before modifying.

---

# 3. ARCHITECTURAL RULE

Financial data is highly sensitive.

Every financial record must have authoritative society ownership.

Where appropriate, financial records should also resolve to:

```text
Society
   ↓
Unit
   ↓
Resident / Account Holder
```

Never trust client-provided ownership.

---

# 4. MANDATORY SECURITY RULES

Never:

* Disable RLS.
* Bypass RLS.
* Trust `society_id` from client payload.
* Trust `unit_id` from client payload without authorization.
* Trust resident/user IDs from client payload.
* Allow residents to alter their own billed amounts.
* Allow residents to mark invoices as paid.
* Allow residents to create receipts.
* Allow residents to modify financial configuration.
* Store payment-card credentials.
* Store sensitive payment credentials unnecessarily.
* Create fake invoices.
* Create fake payment records.
* Create mock balances.
* Introduce a second financial permission system.

Use UUID relationships.

---

# 5. MAINTENANCE CHARGE CONFIGURATION

Implement configurable maintenance charges.

Possible charge models:

* Fixed monthly charge
* Per-unit charge
* Area-based charge
* Category-based charge
* Other model only if supported by approved architecture

Do not hardcode a single charging model if the architecture needs extensibility.

Configuration should support:

* Name
* Description
* Amount/rate
* Effective date
* Frequency
* Applicability
* Active/inactive status

Financial configuration must be restricted to authorized society roles.

---

# 6. BILLING CYCLES

Implement billing-cycle foundation.

Support:

* Billing period
* Start date
* End date
* Due date
* Status
* Generation timestamp
* Society association

Prevent accidental duplicate billing cycles.

Where billing generation is repeatable, use idempotent server-side logic.

---

# 7. INVOICES

Implement resident/unit invoices.

Each invoice should have authoritative relationships to:

```text
Society
Unit
Billing Cycle
Charge Configuration
```

Where required:

* Invoice number
* Invoice date
* Due date
* Line items
* Subtotal
* Adjustments
* Total
* Amount paid
* Balance due
* Status

Invoice numbering must be generated server-side.

Do not trust invoice totals submitted by clients.

---

# 8. RESIDENT DUES

Residents should be able to see their authorized financial obligations.

Display:

* Current dues
* Invoice history
* Due dates
* Paid amounts
* Outstanding balance
* Payment status

Residents must only see their own authorized financial records.

No cross-unit access.

No cross-society access.

---

# 9. RECEIPTS

Implement receipts for recorded payments.

Receipt records should include:

* Receipt number
* Invoice relationship
* Amount
* Payment date
* Payment method
* Reference number where appropriate
* Recorded by
* Audit information

Receipt numbers must be server-generated.

Do not allow clients to fabricate receipt numbers.

---

# 10. PAYMENT STATUS

Support clear states such as:

```text
UNPAID
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

Use a server-authoritative state machine.

Prevent invalid transitions.

Examples:

* Paid invoice cannot arbitrarily become unpaid.
* Cancelled invoice cannot accept normal payment.
* Payment cannot exceed allowed balance unless the architecture explicitly supports overpayment.

---

# 11. MANUAL PAYMENT RECORDING

Authorized society financial personnel may record manual payments.

Examples:

* Cash
* Cheque
* Bank transfer
* Other approved offline methods

Every manual payment must:

* Validate invoice
* Validate society
* Validate amount
* Validate authorization
* Create audit event
* Update invoice balance/status transactionally where possible

Residents must never be allowed to self-record an official payment.

---

# 12. PAYMENT GATEWAY ABSTRACTION

Do NOT tightly couple DwellSync to one payment provider.

Create a provider abstraction.

Conceptually:

```text
DwellSync Payment Service
          ↓
Payment Provider Interface
          ↓
 ┌──────────────┬──────────────┬──────────────┐
 │ Provider A   │ Provider B   │ Future       │
 └──────────────┴──────────────┴──────────────┘
```

The business layer must not depend directly on provider-specific SDK calls.

If no provider is approved yet, implement the abstraction and integration boundary rather than inventing a live payment integration.

Do not store card data.

Do not store unnecessary payment credentials.

---

# 13. FINANCIAL PERMISSIONS

Reuse the existing RBAC/permission system.

Potential permissions may include:

```text
billing.view
billing.manage
billing.generate
billing.record_payment
billing.manage_configuration
billing.view_reports
```

Only introduce permissions that are genuinely necessary.

Do not create a parallel financial-role hierarchy.

---

# 14. FINANCIAL AUDIT

Use the existing audit system.

Audit:

* Charge configuration changes
* Billing cycle creation
* Invoice generation
* Invoice cancellation
* Manual payment recording
* Receipt generation
* Payment-status changes
* Financial configuration changes

Audit records must identify the authenticated actor and society.

---

# 15. TRANSACTIONAL INTEGRITY

Financial operations must be designed for consistency.

Where possible:

```text
Payment
   ↓
Receipt
   ↓
Invoice balance
   ↓
Invoice status
```

should be updated atomically.

Prevent:

* Duplicate payment recording
* Duplicate receipts
* Double invoice generation
* Race-condition balance corruption

Use idempotency where appropriate.

---

# 16. RLS

Implement and test RLS for every financial table.

Test:

### Resident

Can:

* View own authorized invoices
* View own receipts
* View own dues

Cannot:

* View another unit's invoices
* Modify financial configuration
* Record official payments
* Modify invoices

### Society Financial Admin

Can:

* Manage authorized financial data for own society

Cannot:

* Access another society

### SUPER_ADMIN

Remain platform-level.

Do not use SUPER_ADMIN as a shortcut to bypass society RLS in ordinary society workflows.

---

# 17. FINANCIAL DATA PRIVACY

Financial information is sensitive.

Avoid exposing unnecessary data through:

* API responses
* Browser payloads
* URLs
* client state
* logs
* error messages

Never expose database service-role credentials.

---

# 18. FULL ACCOUNTING IS OUT OF SCOPE

Do NOT implement a complete accounting/general-ledger system unless the existing approved architecture explicitly requires it.

Do not introduce:

* General ledger
* Chart of accounts
* Double-entry accounting
* Journal system
* Trial balance
* Balance sheet
* Profit/loss accounting

unless specifically approved later.

Phase 9 is **maintenance billing**, not full accounting software.

---

# 19. UI / UX

Provide:

### Resident

* My dues
* Invoice list
* Invoice details
* Payment status
* Receipt history

### Authorized Admin

* Billing dashboard
* Charge configuration
* Billing cycles
* Invoice generation
* Payment recording
* Receipts
* Outstanding dues

Use Clean Minimalism.

Provide:

* Loading states
* Empty states
* Error states
* Unauthorized states
* Confirmation states
* Mobile-responsive views

Never populate financial dashboards with fake values.

---

# 20. TESTING

Create comprehensive Phase 9 tests.

At minimum:

### Charges

* Configuration creation
* Update
* Authorization
* Society isolation

### Billing

* Cycle creation
* Duplicate prevention
* Invoice generation
* Invoice calculation
* Idempotency

### Resident Privacy

* Own invoices visible
* Other-unit invoices blocked
* Cross-society invoices blocked

### Payments

* Manual payment
* Amount validation
* Duplicate prevention
* Status transition
* Receipt generation

### Security

* RLS
* RBAC
* Payload tampering
* URL tampering
* Tenant manipulation

### Audit

Verify all important financial mutations create audit events.

---

# 21. REGRESSION

Run the entire existing test suite.

Verify:

```text
Phase 0
Phase 1
Phase 2
Phase 3
Phase 4
Phase 5
Phase 6
Phase 7
Phase 8
Phase 9
```

Do not break visitor management, resident portal, authentication, society hierarchy, or existing operations.

Also run:

```text
TypeScript
ESLint
Production build
```

using the project's actual scripts.

---

# 22. HARD STOP

Do NOT implement:

* Full accounting
* General ledger
* Advanced financial reporting
* Phase 10 communication provider integrations
* Phase 11 governance redesign
* Phase 12 analytics/production hardening

Stop after Phase 9.

---

# 23. FINAL REPORT

Return:

# DWELLSYNC — PHASE 9 COMPLETION REPORT

Include:

1. Status
2. Workspace audit
3. Financial architecture
4. Database changes
5. Migrations
6. Charge configuration
7. Billing cycles
8. Invoice architecture
9. Resident dues
10. Receipts
11. Manual payments
12. Payment-provider abstraction
13. Financial permissions
14. RLS
15. Financial privacy
16. Audit trail
17. Transaction/idempotency controls
18. Security threat-vector review
19. Test results
20. Full regression results
21. TypeScript
22. ESLint
23. Production build
24. Files created
25. Files modified
26. Known limitations
27. Manual QA instructions
28. Confirmation that full accounting was NOT implemented
29. Confirmation that Phase 10+ were NOT implemented

End with:

**PHASE 9 COMPLETE — STRICT STOP CONDITION MET.**

Do not proceed to Phase 10 without explicit approval.
