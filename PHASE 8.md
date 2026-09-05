DwellSync_Phase_08_Society_Operations.md

Scope:

Notices/announcements
complaints & requests
amenities
events
society documents
meeting/calendar foundation
resident/admin workflows
permissions and approvals
audit trail

Hard stop: no accounting/payment implementation.

DwellSync_Phase_09_Maintenance_Billing.md

Scope:

maintenance charge configuration
billing cycles
invoices
resident dues
receipts
payment status
manual payment recording
payment gateway abstraction
financial permissions
financial audit

Hard stop: don't build full accounting/ledger unless specifically required by the approved architecture.

DwellSync_Phase_10_Communication_Notifications.md

Scope:

in-app notifications
email architecture
notification preferences
event-driven notification system
templates
delivery status
WhatsApp/SMS-ready abstraction
notification audit

Important: Don't tightly couple DwellSync to one provider. Build provider abstractions so providers can be changed later.

DwellSync_Phase_11_Governance_Administration.md

Scope:

committee/admin management
role assignment
permission administration
approval workflows
society configuration
audit logs
governance controls
administrative delegation
secure role transitions

Hard stop: SUPER_ADMIN remains platform-level and must not become a shortcut around society RLS.

DwellSync_Phase_12_Analytics_Production_Hardening.md

Scope:

society dashboards
operational reports
financial reports
resident statistics
visitor statistics
performance optimization
database indexes
caching where appropriate
observability
security audit
RLS audit
production build
scalability
backup/recovery considerations
accessibility
responsive/mobile QA
final production readiness

Hard stop: no new major business module. This phase is about making what we've built production-grade.