# DwellSync — Database Design

## Multi-Tenant Schema Architecture

```
                    ┌─────────────────────────┐
                    │    public.societies     │
                    └────────────┬────────────┘
                                 │ 1:N
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────────────┐
│public.buildings│       │ public.units  │        │society_memberships    │
└───────┬───────┘        └───────┬───────┘        └───────────┬───────────┘
        │ 1:N                    │ 1:N                        │ N:1
        ▼                        ▼                            ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────────────┐
│ public.wings  │        │  unit_owners  │        │    public.profiles    │
└───────┬───────┘        └───────┬───────┘        └───────────────────────┘
        │ 1:N                    │
        ▼                        ▼
┌───────────────┐        ┌───────────────┐
│ public.floors │        │unit_occupancy │
└───────────────┘        └───────────────┘
```

## Immutable Audit Trail (`public.audit_logs`)
Every critical action (user creation, impersonation start/exit, building generation, ownership change, society update) produces an append-only cryptographic event record in `public.audit_logs`.

