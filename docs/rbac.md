# Role-Based Access Control (RBAC) & Persona Matrix

## Standard System Roles

| Role ID | Name | Scope | Key Capabilities |
|---|---|---|---|
| `SUPER_ADMIN` | Platform Super Admin | Platform | Global platform governance, tenant management, impersonation, audit stream |
| `SOCIETY_ADMIN` | Society Administrator | Society | Full administrative authority for a specific housing society |
| `COMMITTEE_MEMBER` | Management Committee | Society | Governance, complaints escalation, documents, circulars |
| `SECRETARY` | Society Secretary | Society | Administrative and communication leadership, membership management |
| `TREASURER` | Society Treasurer | Society | Financial authority, accounting, maintenance billing |
| `MANAGER` | Facility / Society Manager | Society | Day-to-day operations, vendor coordination, visitor supervision |
| `RESIDENT` | Regular Resident | Society | Helpdesk complaints, circulars, directory, personal billing |
| `OWNER` | Property Owner | Society | Unit owner voting, tenant authorizations, maintenance ledger |
| `TENANT` | Occupant / Tenant | Society | Helpdesk complaints, amenities booking, visitor approval |
| `SECURITY` | Gate Security | Society | Visitor entry/exit logging, delivery approvals |
| `STAFF` | Society Staff / Maintenance | Society | Assigned work orders, maintenance tasks |
| `VENDOR` | External Contractor | Society | Vendor profile, assigned service requests |
| `AUDITOR` | Financial Auditor | Society | Read-only ledger, accounting vouchers, financial audit trail |

## Permission Catalog

- **Platform Category**: `platform.admin`, `platform.impersonate`, `platform.audit_logs.view`, `societies.create`, `societies.view`, `societies.manage`, `users.manage_platform`
- **Society Category**: `society.view`, `society.manage`
- **Residents Category**: `residents.view`, `residents.manage`
- **Complaints Category**: `complaints.view`, `complaints.create`, `complaints.manage`
- **Visitors Category**: `visitors.view`, `visitors.manage`
- **Billing Category**: `billing.view`, `billing.manage`
- **Documents Category**: `documents.view`, `documents.manage`
- **Audit Category**: `audit.view`
