import type { SignedJwt } from '@atproto/jwk'
import type { OAuthClientMetadata } from '@atproto/oauth-types'
import type { Account, DeviceMetadata, ISODateString } from './types.js'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'

// These are the endpoints implemented by the OAuth provider, for its UI to
// call.

export type ApiEndpoints = {
  '/verify-handle-availability': {
    method: 'POST'
    input: VerifyHandleAvailabilityInput
    output: { available: true }
  }
  '/sign-up': {
    method: 'POST'
    input: SignUpInput
    output: SignUpOutput
  }
  '/sign-in': {
    method: 'POST'
    input: SignInInput
    output: SignInOutput
  }
  '/reset-password-request': {
    method: 'POST'
    input: InitiatePasswordResetInput
    output: { success: true }
  }
  '/reset-password-confirm': {
    method: 'POST'
    input: ConfirmResetPasswordInput
    output: { success: true }
  }
  '/sign-out': {
    method: 'POST'
    input: SignOutInput
    output: { success: true }
  }
  /**
   * Lists all the accounts that are currently active, on the current device.
   */
  '/device-sessions': {
    method: 'GET'
    output: ActiveDeviceSession[]
  }
  /**
   * Lists all the active OAuth sessions (access/refresh tokens) that where
   * issued to OAuth clients (apps).
   *
   * @NOTE can be revoked using the oauth revocation endpoint (json or form
   * encoded)
   *
   * ```http
   * POST /oauth/revoke
   * Content-Type: application/x-www-form-urlencoded
   *
   * token=<tokenId>
   * ```
   */
  '/oauth-sessions': {
    method: 'GET'
    params: { sub: string }
    output: ActiveOAuthSession[]
  }
  '/revoke-oauth-session': {
    method: 'POST'
    input: RevokeOAuthSessionInput
    output: { success: true }
  }
  /**
   * Lists all the sessions that are currently active for a particular user, on
   * other devices.
   */
  '/account-sessions': {
    method: 'GET'
    params: { sub: string }
    output: ActiveAccountSession[]
  }
  '/revoke-account-session': {
    method: 'POST'
    input: RevokeAccountSessionInput
    output: { success: true }
  }
  '/consent': {
    method: 'POST'
    input: ConsentInput
    output: { url: string }
  }
  '/reject': {
    method: 'POST'
    input: RejectInput
    output: { url: string }
  }
  '/passkey/register-challenge': {
    method: 'POST'
    input: PasskeyRegisterChallengeInput
    output: PasskeyRegisterChallengeOutput
  }
  '/passkey/register-verify': {
    method: 'POST'
    input: PasskeyRegisterVerifyInput
    output: { success: true }
  }
  '/passkey/authenticate-challenge': {
    method: 'POST'
    input: PasskeyAuthenticateChallengeInput
    output: PasskeyAuthenticateChallengeOutput
  }
  '/passkey/list': {
    method: 'GET'
    params: { sub: string }
    output: Passkey[]
  }
  '/passkey/delete': {
    method: 'POST'
    input: PasskeyDeleteInput
    output: { success: true }
  }
}

/**
 * When a user signs in without the "remember me" option, the server returns an
 * ephemeral token. When used as `Bearer` authorization header, the token will
 * be used in order to authenticate the users in place of using the user's
 * cookie based session (which are only created when "remember me" is checked).
 *
 * Only include this token in the `Authorization` header when making requests to
 * the OAuth provider API, **FOR THE ACCOUNT IT WAS GENERATED FOR**.
 */
export type EphemeralToken = SignedJwt

export type SignInInput = {
  locale: string
  username: string
  password?: string
  emailOtp?: string
  passkeyCredential?: AuthenticationResponseJSON
  remember?: boolean
}

export type SignInOutput = {
  account: Account
  ephemeralToken?: EphemeralToken
  consentRequired?: boolean
}

export type SignUpInput = {
  locale: string
  handle: string
  email: string
  password: string
  inviteCode?: string
  hcaptchaToken?: string
}

export type SignUpOutput = {
  account: Account
  ephemeralToken?: EphemeralToken
}

export type SignOutInput = {
  sub: string | string[]
}

export type InitiatePasswordResetInput = {
  locale: string
  email: string
}

export type ConfirmResetPasswordInput = {
  token: string
  password: string
}

export type VerifyHandleAvailabilityInput = {
  handle: string
}

export type RevokeAccountSessionInput = {
  sub: string
  deviceId: string
}

export type RevokeOAuthSessionInput = {
  sub: string
  tokenId: string
}

export type ConsentInput = {
  sub: string
  scope?: string
}

export type RejectInput = Record<string, never>

export type PasskeyRegisterChallengeInput = {
  username: string
}

export type PasskeyRegisterChallengeOutput = {
  options: RegistrationResponseJSON
}

export type PasskeyRegisterVerifyInput = {
  username: string
  response: RegistrationResponseJSON
  deviceName?: string
}

export type PasskeyAuthenticateChallengeInput = {
  username: string
}

export type PasskeyAuthenticateChallengeOutput = {
  options: AuthenticationResponseJSON
}

export type Passkey = {
  credentialId: string
  deviceName: string
  createdAt: ISODateString
  lastUsedAt: ISODateString | null
  backupEligible: boolean
  backupState: boolean
}

export type PasskeyDeleteInput = {
  sub: string
  credentialId: string
}

/**
 * Represents an account that is currently signed-in to the Authorization
 * Server. If the session was created too long ago, the user may be required to
 * re-authenticate ({@link ActiveDeviceSession.loginRequired}).
 */
export type ActiveDeviceSession = {
  account: Account

  /**
   * The session is too old and the user must re-authenticate.
   */
  loginRequired: boolean
}

/**
 * Represents another device on which an account is currently signed-in.
 */
export type ActiveAccountSession = {
  deviceId: string
  deviceMetadata: DeviceMetadata

  isCurrentDevice: boolean
}

/**
 * Represents an active OAuth session (access token).
 */
export type ActiveOAuthSession = {
  tokenId: string

  createdAt: ISODateString
  updatedAt: ISODateString

  clientId: string
  /** An "undefined" value means that the client metadata could not be fetched */
  clientMetadata?: OAuthClientMetadata

  scope?: string
}
