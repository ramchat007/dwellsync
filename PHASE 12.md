# DWELLSYNC — PHASE 12 MASTER IMPLEMENTATION PROMPT

## ANALYTICS & PRODUCTION HARDENING

**Execution Environment:** Antigravity
**Product:** DwellSync
**Phase:** 12
**Phase Name:** Analytics, Reporting & Production Hardening
**Mode:** Production readiness
**Database:** Existing connected Supabase/PostgreSQL database
**Framework:** Existing Next.js App Router application

---

# 1. MISSION

This is the final planned implementation phase.

The objective is NOT to introduce another major business module.

The objective is:

> **Make the existing DwellSync platform production-grade, secure, scalable, observable, accessible, responsive, and operationally ready.**

Use the existing functionality from Phases 0–11.

Do not redesign completed systems without evidence.

---

# 2. HARD STOP — NO NEW MAJOR BUSINESS MODULE

This phase must NOT introduce:

* New resident modules
* New visitor modules
* New billing modules
* New governance modules
* New communication modules
* New accounting systems
* New major business workflows

If a missing feature is discovered that belongs to a previous business phase:

1. Document it.
2. Classify it as a gap.
3. Do not silently implement it as part of Phase 12 unless it is strictly required for production readiness.

---

# 3. EXECUTION ORDER

```text
PHASE 12.0 — Complete Production Readiness Audit
        ↓
PHASE 12.1 — Analytics / Reporting Audit
        ↓
PHASE 12.2 — Database Performance Audit
        ↓
PHASE 12.3 — RLS / Security Audit
        ↓
PHASE 12.4 — Application Performance Optimization
        ↓
PHASE 12.5 — Caching / Query Optimization
        ↓
PHASE 12.6 — Observability / Error Handling
        ↓
PHASE 12.7 — Accessibility / Responsive QA
        ↓
PHASE 12.8 — Backup / Recovery Readiness
        ↓
PHASE 12.9 — Scalability Review
        ↓
PHASE 12.10 — Full Regression
        ↓
PHASE 12.11 — Production Build / Release Verification
        ↓
PHASE 12.12 — Final Production Readiness Report
        ↓
FINAL STOP
```

---

# 4. ANALYTICS / DASHBOARDS

Implement or finalize appropriate dashboards using real database data.

Potential dashboard categories:

## Society

* Residents
* Units
* Visitors
* Notices
* Complaints
* Events
* Amenities
* Billing status

## Operational

* Complaint trends
* Visitor trends
* Notice engagement where data exists
* Amenity usage where data exists

## Financial

* Outstanding dues
* Paid amounts
* Billing status
* Collection summaries

Do not fabricate metrics.

Every metric must have an identifiable authoritative data source.

---

# 5. REPORTING

Implement useful operational reports.

Potential reports:

* Resident statistics
* Unit occupancy
* Visitor traffic
* Complaint statistics
* Billing summaries
* Collection status
* Society activity

Reports must respect tenant isolation.

A user from Society A must never receive Society B's data through:

* UI
* API
* exports
* aggregated queries
* cached responses

---

# 6. FINANCIAL REPORT SECURITY

Financial reports are sensitive.

Only authorized users may access them.

Do not expose financial reports to ordinary residents unless explicitly permitted.

Residents should only receive their own financial information.

---

# 7. DATABASE PERFORMANCE AUDIT

Inspect:

* Query patterns
* Missing indexes
* Redundant indexes
* Foreign keys
* High-frequency queries
* N+1 patterns
* Large table scans
* RLS performance
* Sorting/filtering performance

Add indexes only when justified.

Do not create excessive indexes that damage write performance.

Document every significant index added.

---

# 8. QUERY OPTIMIZATION

Inspect server-side data fetching.

Look for:

* Duplicate queries
* N+1 queries
* Unnecessary full-table reads
* Over-fetching
* Repeated identity resolution
* Inefficient joins
* Excessive client-side aggregation

Prefer authoritative database-side operations where appropriate.

Do not move security checks entirely to the client merely for performance.

---

# 9. CACHING

Introduce caching only where safe.

Never cache tenant-sensitive data without including appropriate tenant/user authorization boundaries.

Be extremely careful with:

* Society dashboards
* Resident data
* Financial data
* Visitor data
* Notifications
* Permissions

If caching creates a realistic cross-tenant leakage risk, do not implement it.

Document caching decisions.

---

# 10. OBSERVABILITY

Strengthen production observability.

Inspect:

* Error logging
* Error boundaries
* API failures
* Database failures
* Authentication failures
* Authorization failures
* Notification failures
* Payment failures
* Visitor workflow failures

Errors should be diagnosable without exposing sensitive information to end users.

Avoid logging:

* Passwords
* Tokens
* API keys
* Payment credentials
* unnecessary personal information

---

# 11. SECURITY AUDIT

Perform a comprehensive security review.

Test:

```text
Authentication
Authorization
RBAC
RLS
Tenant isolation
Session handling
Cookie security
CSRF-sensitive workflows
API authorization
URL tampering
Payload tampering
IDOR
Privilege escalation
Sensitive data exposure
Error leakage
Provider credential exposure
```

Review all major API routes.

---

# 12. RLS AUDIT

Perform a table-by-table RLS audit.

For every society-scoped table verify:

```text
RLS enabled
Correct SELECT policy
Correct INSERT policy
Correct UPDATE policy
Correct DELETE policy
Correct society relationship
Correct user relationship
No policy accidentally exposes another society
```

Pay particular attention to:

* Residents
* Units
* Unit owners
* Unit occupancies
* Family members
* Visitors
* Notices
* Complaints
* Documents
* Amenities
* Events
* Meetings
* Billing
* Invoices
* Payments
* Receipts
* Notifications
* Governance records

---

# 13. TENANT-ISOLATION TESTING

Perform deliberate cross-tenant tests.

For example:

```text
Society A user
      ↓
attempts Society B resource
      ↓
MUST FAIL
```

Test via:

* UI
* Direct URL
* API
* Payload manipulation
* Database query where possible

Repeat for sensitive resources.

---

# 14. AUTHENTICATION / SESSION REVIEW

Verify:

* Login
* Logout
* Session restoration
* Expired session
* Invalid session
* Inactive membership
* Society context restoration
* Role resolution
* Permission resolution

Ensure no stale authorization state survives logout or role changes.

---

# 15. PERFORMANCE

Measure and optimize where evidence supports it.

Inspect:

* Server response times
* Database query performance
* Large list rendering
* Dashboard loading
* API latency
* Bundle size
* Image optimization
* Client-side JavaScript
* Mobile performance

Do not optimize blindly.

Record meaningful before/after measurements where available.

---

# 16. ACCESSIBILITY

Review:

* Keyboard navigation
* Focus states
* Labels
* Buttons
* Form errors
* Dialog accessibility
* Contrast
* Screen-reader semantics
* Heading hierarchy
* Mobile touch targets

Fix important accessibility defects.

---

# 17. RESPONSIVE / MOBILE QA

Test major experiences:

* Resident portal
* Society operations
* Visitor/security dashboard
* Billing
* Notifications
* Governance
* Reports

Check:

* Mobile
* Tablet
* Desktop

Do not create separate duplicate application architectures for mobile.

---

# 18. BACKUP / RECOVERY READINESS

Review Supabase/database backup and recovery considerations.

Document:

* Backup strategy
* Recovery strategy
* Recovery assumptions
* Data restoration procedure
* Migration safety
* Disaster recovery considerations

Do not claim a backup exists unless it has actually been configured and verified.

Do not falsely claim a recovery test was performed if it was not.

---

# 19. MIGRATION SAFETY

Review all migrations.

Ensure:

* Ordering is correct
* No destructive migration is accidental
* Foreign keys are valid
* RLS policies survive deployment
* Indexes are valid
* Rollback/recovery implications are understood

Do not reset or recreate the production database.

---

# 20. SCALABILITY

Assess whether the architecture can reasonably support growth.

Review:

* Database query patterns
* Indexing
* Connection usage
* API architecture
* Server rendering
* Client rendering
* Storage
* Notification architecture
* Background processing where applicable
* Large society datasets

Do not introduce unnecessary infrastructure merely for theoretical scale.

Document actual bottlenecks and recommendations.

---

# 21. PRODUCTION BUILD

Run the complete production verification:

```text
Tests
TypeScript
ESLint
Next.js Production Build
```

Use the actual project scripts.

Verify all routes compile.

---

# 22. FULL REGRESSION

Run every test from Phases 0–12.

The final platform must not regress:

* Authentication
* Society onboarding
* Resident identity
* Resident portal
* Security gate
* Visitor management
* Society operations
* Billing
* Notifications
* Governance
* RLS
* Audit

---

# 23. FINAL SECURITY THREAT MATRIX

Produce a final matrix covering at minimum:

| Threat                       | Test                          | Result | Evidence |
| ---------------------------- | ----------------------------- | ------ | -------- |
| Cross-society access         | Attempt foreign tenant access |        |          |
| IDOR                         | Manipulate resource IDs       |        |          |
| Role escalation              | Modify role payload           |        |          |
| Permission escalation        | Modify permission payload     |        |          |
| Session manipulation         | Tamper with session/context   |        |          |
| RLS bypass                   | Direct database access        |        |          |
| Sensitive data exposure      | Inspect API/client responses  |        |          |
| Provider credential exposure | Inspect client bundle         |        |          |
| Financial privacy            | Cross-unit financial access   |        |          |
| Visitor privacy              | Cross-resident visitor access |        |          |

Do not mark a threat "PASS" without actual evidence.

---

# 24. PRODUCTION READINESS SCORECARD

Produce a final scorecard:

```text
Architecture             PASS/FAIL
Authentication           PASS/FAIL
Authorization            PASS/FAIL
RBAC                     PASS/FAIL
RLS                      PASS/FAIL
Tenant Isolation         PASS/FAIL
Resident Portal          PASS/FAIL
Visitor Management       PASS/FAIL
Society Operations       PASS/FAIL
Billing                  PASS/FAIL
Notifications            PASS/FAIL
Governance               PASS/FAIL
Performance              PASS/FAIL
Accessibility            PASS/FAIL
Responsive UX            PASS/FAIL
Observability            PASS/FAIL
Backup/Recovery          PASS/FAIL
Production Build         PASS/FAIL
Regression               PASS/FAIL
```

Do not declare production-ready if a critical security or data-integrity item fails.

---

# 25. NO FALSE CERTIFICATION

Do not claim:

* Production-ready
* Disaster-proof
* Fully scalable
* Fully backed up
* Fully compliant

unless there is evidence supporting the claim.

Clearly distinguish:

```text
VERIFIED
CONFIGURED
PARTIALLY VERIFIED
NOT VERIFIED
RECOMMENDED
```

---

# 26. FINAL REPORT

Return:

# DWELLSYNC — PHASE 12 FINAL PRODUCTION READINESS REPORT

Include:

1. Executive summary
2. Architecture status
3. Analytics/dashboard status
4. Reporting status
5. Database performance audit
6. Index changes
7. Query optimization
8. Caching decisions
9. Observability
10. Security audit
11. RLS audit
12. Tenant-isolation audit
13. Authentication/session audit
14. RBAC audit
15. Performance findings
16. Accessibility findings
17. Responsive/mobile QA
18. Backup/recovery assessment
19. Migration safety assessment
20. Scalability assessment
21. Test results
22. Full regression results
23. TypeScript
24. ESLint
25. Production build
26. Security threat matrix
27. Production readiness scorecard
28. Files created
29. Files modified
30. Database changes
31. Remaining risks
32. Recommended post-launch improvements
33. Explicit list of anything NOT verified
34. Confirmation that no new major business module was introduced

---

# 27. FINAL STOP CONDITION

This is the final planned phase.

After completing the report:

**STOP.**

Do not automatically create another development phase.

Do not introduce new business functionality merely because an improvement opportunity was discovered.

Classify future work as:

```text
POST-LAUNCH IMPROVEMENT
```

and document it separately.

End the report with:

**DWELLSYNC PHASE 12 COMPLETE — FINAL PRODUCTION READINESS REVIEW COMPLETE — STRICT STOP CONDITION MET.**
