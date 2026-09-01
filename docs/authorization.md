# Authorization & Server-Side Security Functions

## Philosophy

"Frontend checks are for UI affordance; Server-side checks are the actual security mechanism."

A hidden button is NOT security. Every protected server operation independently validates permissions using centralized server authorization functions.

## Centralized Server Authorization API

Located in `@/lib/auth/server.ts`:

- `getCurrentIdentity()`: Resolves authenticated identity, checks for active impersonation session token, and returns complete original vs effective identity state.
- `requireAuth()`: Enforces authentication; redirects unauthenticated visitors to `/login`.
- `requireSuperAdmin()`: Guards platform-level operations; verifies caller is in `public.platform_admins`.
- `requireSocietyAccess(societyId)`: Validates that the effective user holds an active membership in the target society tenant.
- `requirePermission(permissionKey)`: Validates that the effective user's current role possesses the granular permission key.

## Client Authorization Hook (`useAuth`)

Located in `@/lib/auth/client.tsx`:

```tsx
const {
  user,
  profile,
  isAuthenticated,
  isSuperAdmin,
  isSocietyAdmin,
  isImpersonating,
  originalUser,
  effectiveUser,
  currentSociety,
  currentRole,
  permissions,
  hasRole,
  hasPermission,
  can
} = useAuth();
```

### Usage Examples:
```tsx
// Checking role
if (hasRole("SOCIETY_ADMIN")) { ... }

// Checking granular permission
if (can("residents.manage")) { ... }

// Checking platform owner status
if (isSuperAdmin && !isImpersonating) { ... }
```
