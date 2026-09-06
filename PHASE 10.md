# DWELLSYNC — PHASE 10 MASTER IMPLEMENTATION PROMPT

## COMMUNICATION & NOTIFICATIONS

**Execution Environment:** Antigravity
**Product:** DwellSync
**Phase:** 10
**Phase Name:** Communication & Notifications
**Mode:** Production implementation
**Database:** Existing connected Supabase/PostgreSQL database
**Framework:** Existing Next.js App Router application

---

# 1. MISSION

Implement **Phase 10 — Communication & Notifications**.

Build a provider-independent communication architecture supporting:

* In-app notifications
* Email architecture
* Notification preferences
* Event-driven notifications
* Templates
* Delivery status
* WhatsApp/SMS-ready abstraction
* Notification audit

The existing DwellSync notification architecture must be inspected first and extended rather than duplicated.

---

# 2. EXECUTION ORDER

```text
PHASE 10.0 — Notification Architecture Audit
        ↓
PHASE 10.1 — Provider / Event / Template Gap Analysis
        ↓
PHASE 10.2 — Approved Architecture Plan
        ↓
PHASE 10.3 — Core Notification Infrastructure
        ↓
PHASE 10.4 — In-App Notifications
        ↓
PHASE 10.5 — Email Abstraction
        ↓
PHASE 10.6 — Preferences / Templates / Delivery Tracking
        ↓
PHASE 10.7 — WhatsApp/SMS Provider Abstraction
        ↓
PHASE 10.8 — Security / Privacy / Testing
        ↓
PHASE 10.9 — Regression / Production Build
        ↓
PHASE 10.10 — Final Report
        ↓
STRICT STOP
```

---

# 3. EXISTING ARCHITECTURE

Phase 7 already reported an existing:

```text
sendNotification()
```

service.

Inspect and reuse it.

Do not create:

```text
sendNotificationV2()
notificationServiceV2()
```

unless the current implementation genuinely cannot support the approved architecture.

Refactor carefully if necessary.

---

# 4. PROVIDER ABSTRACTION — NON-NEGOTIABLE

DwellSync must NOT be tightly coupled to one communication provider.

Use provider interfaces.

Conceptually:

```text
DwellSync Notification Service
            ↓
Notification Provider Interface
            ↓
 ┌──────────┬──────────┬──────────┬──────────┐
 │ In-App   │  Email   │ WhatsApp │   SMS    │
 └──────────┴──────────┴──────────┴──────────┘
```

Provider-specific SDK code must remain behind provider adapters.

Changing providers later should not require rewriting business logic.

---

# 5. EVENT-DRIVEN ARCHITECTURE

Notifications should be triggered by domain events rather than random UI calls.

Examples:

```text
Visitor Checked In
       ↓
VISITOR_CHECKED_IN
       ↓
Notification Service
       ↓
Resident Notification
```

Other events may include:

* Notice published
* Complaint assigned
* Complaint resolved
* Event published
* Invoice generated
* Payment recorded
* Visitor check-in
* Visitor check-out
* Society announcement
* Other approved domain events

Do not notify users for every database mutation automatically.

Define meaningful notification events.

---

# 6. IN-APP NOTIFICATIONS

Implement:

* Notification inbox
* Unread count
* Read/unread status
* Mark as read
* Mark all as read where appropriate
* Notification timestamp
* Notification type
* Deep-link/action where appropriate

Users must only see notifications intended for them.

Cross-user notification leakage must be impossible.

---

# 7. EMAIL ARCHITECTURE

Build an email abstraction.

Conceptually:

```text
Notification Service
       ↓
Email Provider Interface
       ↓
Provider Adapter
```

The application should not directly depend on a single provider.

If an actual provider is not yet configured, implement the architecture without inventing credentials.

Never put provider API keys in source code.

---

# 8. NOTIFICATION PREFERENCES

Users should be able to configure notification preferences where appropriate.

Potential controls:

* In-app
* Email
* SMS
* WhatsApp

Potential event categories:

* Society notices
* Complaints
* Visitors
* Billing
* Events
* Administrative messages

Respect mandatory/security-critical notifications where business rules require them.

Do not allow users to disable security-critical alerts merely because a preference exists.

---

# 9. TEMPLATES

Create reusable notification templates.

Templates should support:

* Event type
* Channel
* Subject/title
* Body
* Variables
* Active/inactive status
* Versioning where appropriate

Do not hardcode large message bodies throughout route handlers.

Use safe variable interpolation.

Never allow untrusted template content to execute code.

---

# 10. DELIVERY STATUS

Track delivery lifecycle where the channel supports it.

Example:

```text
PENDING
SENT
DELIVERED
FAILED
READ
```

Do not claim `DELIVERED` merely because an API request was accepted.

Distinguish provider acceptance from actual delivery where possible.

---

# 11. RETRY / FAILURE HANDLING

Where appropriate:

* Retry transient failures
* Avoid infinite retries
* Track attempts
* Track last error
* Preserve auditability

Notification failure must not break the underlying business transaction.

For example:

```text
Visitor Check-In
      ↓
Business transaction succeeds
      ↓
Notification attempt
      ↓
Notification failure
```

The visitor check-in must not be rolled back merely because an email provider is unavailable unless the approved architecture explicitly requires transactional notification delivery.

---

# 12. WHATSAPP / SMS READY

Create provider abstractions for:

```text
WhatsAppProvider
SMSProvider
```

but do not force a provider selection if none is approved.

Do not hardcode Twilio, Meta, Gupshup, MSG91, or any other provider throughout the application.

Provider-specific implementations belong behind adapters.

---

# 13. AUDIT

Use the existing audit system.

Track meaningful events such as:

* Notification created
* Notification sent
* Delivery failed
* Preference changed
* Template changed
* Provider configuration changed

Never log:

* Passwords
* API keys
* Authentication tokens
* Sensitive personal data unnecessarily

---

# 14. PRIVACY

Notification content may contain sensitive information.

Ensure:

* Correct recipient
* Correct society
* Correct event
* No cross-tenant leakage
* No unauthorized preview
* No sensitive information unnecessarily included in push/email/SMS payloads

Do not expose other residents' data in notifications.

---

# 15. SECURITY

Test:

* Cross-user notification access
* Cross-society access
* Preference tampering
* Template authorization
* Provider configuration authorization
* API endpoint authorization
* Unauthenticated access
* Direct database access/RLS

Provider credentials must never be exposed to the browser.

---

# 16. UI / UX

Implement:

* Notification center
* Notification badge
* Notification detail
* Preference page
* Appropriate admin template management if required

Follow Clean Minimalism.

Provide:

* Loading
* Empty
* Error
* Unauthorized
* Mobile
* Accessible states

---

# 17. TESTING

Create Phase 10 tests for:

### Event generation

* Correct domain event
* Correct recipient
* Correct society

### In-app

* Creation
* Read/unread
* Privacy
* Cross-user isolation

### Preferences

* Save
* Read
* Authorization
* Channel preference behavior

### Templates

* Rendering
* Variable interpolation
* Authorization

### Providers

* Provider abstraction
* Provider failure
* Retry handling
* No provider-specific coupling in domain layer

### Delivery

* Status transitions
* Failure handling
* Duplicate prevention where required

### Security

* RLS
* RBAC
* Cross-society isolation

---

# 18. REGRESSION

All previous phases must remain green.

Especially verify:

* Resident portal
* Visitor notifications
* Billing
* Society operations
* Authentication
* RBAC
* RLS
* Audit

Run the project's actual:

```text
test
typecheck
lint
build
```

commands.

---

# 19. HARD STOP

Do NOT implement:

* New society business modules
* Governance redesign
* Analytics
* Production hardening beyond what is required to verify this phase
* Unapproved communication providers

Stop after Phase 10.

---

# 20. FINAL REPORT

Return:

# DWELLSYNC — PHASE 10 COMPLETION REPORT

Include:

1. Status
2. Existing notification architecture
3. Architecture reused
4. Event architecture
5. In-app notification implementation
6. Email abstraction
7. Notification preferences
8. Template system
9. Delivery tracking
10. Retry/failure handling
11. WhatsApp abstraction
12. SMS abstraction
13. Provider adapters
14. Security/RLS
15. Privacy controls
16. Audit trail
17. Tests
18. Regression results
19. TypeScript
20. ESLint
21. Production build
22. Files created
23. Files modified
24. Provider configuration requirements
25. Known limitations
26. Manual QA instructions
27. Confirmation that no provider lock-in was introduced
28. Confirmation that Phase 11/12 were NOT implemented

End with:

**PHASE 10 COMPLETE — STRICT STOP CONDITION MET.**

Do not proceed to Phase 11 without explicit approval.
