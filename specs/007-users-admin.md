# 007 Users And Admin

## Status

Planned.

## Scope

Admin user management, role changes, password changes, disabled users, app settings, and service health/config status screens.

## Non-Goals

- No email invite flow.
- No external identity provider.

## Contracts

- Admin can create `ADMIN`, `DOWNLOADER`, and `VIEWER` users.
- Admin can disable users and update roles.
- Users can change their own password after authenticating.
- Disabled users cannot log in or use existing sessions.
- Admin settings expose config status, not secret values.

## Security

- Passwords are hashed through `packages/auth`.
- Secrets never return to `apps/web`.
- Role checks guard every admin mutation.

## Failure Modes

- Updating the last enabled admin to disabled blocks.
- Role mutation without admin role returns forbidden.

## Acceptance Criteria

- Users router has create, disable, update role, and password change procedures.
- Admin UI lists users and service/config status.
- Tests cover admin-only access and last-admin protection.

## Dependency Changes

None.
