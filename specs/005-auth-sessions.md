# 005 Auth And Sessions

## Status

Accepted baseline.

## Scope

Define local authentication, password hashing, session token handling, bootstrap mode, and role boundaries.

## Non-Goals

- No Clerk or external identity provider.
- No browser-stored API keys.
- API auth mutations validate request bodies with Valibot.

## Contracts

- Password hashing uses Argon2id through the approved `argon2` package.
- Initial hash parameters are `memoryCost=19456`, `timeCost=3`, `parallelism=1`.
- Session tokens are random 32-byte base64url values.
- Persisted session tokens are SHA-256 hashes keyed with `SESSION_SECRET`; raw tokens are never stored.
- Sessions are transported in an HTTP-only cookie named `tailstreamer_session`.
- Cookie settings are `SameSite=Lax`, `Path=/`, and `Secure` in production.
- Bootstrap mode is available only while no enabled admin exists and requires `BOOTSTRAP_SECRET`.
- Roles are `ADMIN`, `DOWNLOADER`, and `VIEWER`.

## Security

- Do not log passwords, raw session tokens, bootstrap secret, or token hashes.
- Delete expired sessions during authenticated request handling or scheduled cleanup.
- Disabled users cannot create or use sessions.
- Password verification must use the hash verifier, not string comparison.

## Failure Modes

- Missing `SESSION_SECRET` in production blocks API startup.
- Bootstrap attempts after an enabled admin exists return conflict.
- Invalid credentials return a generic auth failure.
- Any auth endpoint accepting unvalidated request bodies is blocked.

## Acceptance Criteria

- `packages/auth` exports password hash/verify helpers using Argon2id.
- `packages/auth` exports session token creation and secret-keyed token hashing.
- `packages/auth` exports cookie serialize/parse helpers without adding a cookie dependency.
- Auth package contains tests for hash verification, failed verification, token hashing stability, token uniqueness, and cookie round trip.
- Dependency policy includes `argon2` and no validation library.

## Dependency Changes

Approved: `argon2`. API auth request validation uses approved `valibot`.
