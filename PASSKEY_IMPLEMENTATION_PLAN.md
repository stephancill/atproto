# Passkey Support for AT Protocol PDS - Implementation Plan

## Overview
Add WebAuthn passkey support to the AT Protocol PDS, allowing registered users to:
1. Enroll one or more passkeys (after creating account with password)
2. Sign into apps using OAuth with passkeys as an alternative to passwords
3. Manage their passkeys through account settings

## Design Decisions
- **Account Creation**: Password required initially, passkeys added post-registration
- **Passkey Limits**: Unlimited number of passkeys per account
- **Device Names**: Auto-generated (e.g., "Passkey #1", "Passkey #2")
- **Backup Eligibility**: No requirement for backup-eligible credentials
- **Authentication**: Passkey OR password (mutually exclusive, not both)

## Implementation Phases

### Phase 1: Dependencies & Configuration
- Add `@simplewebauthn/browser` and `@simplewebauthn/server` to pds
- Add passkey configuration to env and config files

### Phase 2: Database Schema
- Create migration `008-passkey-support.ts`
- Create passkey schema types

### Phase 3: OAuth Provider API Changes
- Add passkey endpoints to `@atproto/oauth-provider-api`
- Update `SignInInput` to support passkey credentials

### Phase 4: OAuth Provider Types
- Update `AuthenticateAccountData` in `@atproto/oauth-provider`
- Add passkey-related type definitions

### Phase 5: Passkey Helper Functions
- Create `packages/pds/src/account-manager/helpers/passkey.ts`
- Implement registration, authentication, and management functions

### Phase 6: OAuthStore Implementation
- Update `OAuthStore` to handle passkey authentication
- Add passkey challenge generation and verification

### Phase 7: OAuth Provider Backend
- Create passkey API handlers in `@atproto/oauth-provider`
- Register new API routes
- Update sign-in handler

### Phase 8: OAuth Provider Frontend
- Create passkey UI components
- Update sign-in page with passkey option
- Create passkeys management page
- Add data hooks for passkey operations

### Phase 9: PDS XRPC Endpoints (Optional)
- Create lexicon definitions
- Implement XRPC endpoints for direct access

### Phase 10: AccountManager Integration
- Add passkey methods to AccountManager

### Phase 11: Security & Rate Limiting
- Apply existing rate limiting to passkey endpoints
- Implement counter-based replay attack prevention

### Phase 12: Testing
- Unit tests for passkey helpers
- Integration tests for OAuth flow
- End-to-end tests for user flows

### Phase 13: Documentation
- API documentation
- User guides

## Implementation Order
1. Phases 1-2: Foundation (dependencies, database)
2. Phases 3-5: Core logic (types, helpers)
3. Phases 6-7: Backend (OAuthStore, OAuth Provider)
4. Phase 8: Frontend (UI components)
5. Phases 9-10: Integration (XRPC, AccountManager)
6. Phase 11: Security (rate limiting, replay prevention)
7. Phase 12: Testing (validation)
8. Phase 13: Documentation

## Estimated Time
20-25 hours

## Files to Create
- `packages/pds/src/account-manager/db/migrations/008-passkey-support.ts`
- `packages/pds/src/account-manager/db/schema/passkey.ts`
- `packages/pds/src/account-manager/helpers/passkey.ts`
- `packages/oauth/oauth-provider/src/handlers/passkey.ts`
- Multiple frontend components and hooks

## Files to Modify
- `packages/pds/package.json` (dependencies)
- `packages/pds/src/config/env.ts` (config)
- `packages/pds/src/config/config.ts` (config)
- `packages/oauth/oauth-provider-api/src/api-endpoints.ts` (API definitions)
- `packages/oauth/oauth-provider/src/account/account-store.ts` (types)
- `packages/pds/src/account-manager/oauth-store.ts` (implementation)
- `packages/oauth/oauth-provider-frontend/src/routes/account/_minimalLayout/sign-in.tsx`
- Multiple other frontend files

## Next Steps
See individual commit messages for detailed implementation of each phase.
