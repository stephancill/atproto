import {
  Account,
  ConfirmResetPasswordInput,
  InitiatePasswordResetInput,
} from '@atproto/oauth-provider-api'
import { OAuthScope } from '@atproto/oauth-types'
import { ClientId } from '../client/client-id.js'
import { DeviceId } from '../device/device-id.js'
import { DeviceData } from '../device/device-store.js'
import { HcaptchaVerifyResult } from '../lib/hcaptcha.js'
import { Awaitable, buildInterfaceChecker } from '../lib/util/type.js'
import {
  HandleUnavailableError,
  InvalidRequestError,
  SecondAuthenticationFactorRequiredError,
} from '../oauth-errors.js'
import { Sub } from '../oidc/sub.js'
import { InviteCode } from '../types/invite-code.js'
import { SignUpInput } from './sign-up-input.js'

// Export all types needed to implement the AccountStore interface

export * from '../client/client-id.js'
export * from '../device/device-data.js'
export * from '../device/device-id.js'
export * from '../oidc/sub.js'
export * from '../request/request-id.js'

export type {
  Account,
  HcaptchaVerifyResult,
  InviteCode,
  OAuthScope,
  SignUpInput,
}

export {
  HandleUnavailableError,
  InvalidRequestError,
  SecondAuthenticationFactorRequiredError,
}

export type ResetPasswordRequestInput = InitiatePasswordResetInput
export type ResetPasswordConfirmInput = ConfirmResetPasswordInput

export type CreateAccountData = {
  locale: string
  email: string
  password: string
  handle: string
  inviteCode?: string | undefined
}

export type AuthenticateAccountData = {
  locale: string
  password: string
  username: string
  emailOtp?: string | undefined
}

export type AuthorizedClientData = { authorizedScopes: readonly string[] }
export type AuthorizedClients = Map<ClientId, AuthorizedClientData>

export type DeviceAccount = {
  deviceId: DeviceId

  /**
   * The data associated with the device, created through the
   * {@link DeviceStore}. This data is used to identify devices on which a user
   * has logged in.
   */
  deviceData: DeviceData

  /**
   * The account associated with the device account.
   */
  account: Account

  /**
   * The list of clients that are authorized by the account, as created through
   * the {@link AccountStore.setAuthorizedClient} method.
   */
  authorizedClients: AuthorizedClients

  /**
   * The date at which the device account was created. This value is currently
   * not used.
   */
  createdAt: Date

  /**
   * The date at which the device account was last updated. This value is used
   * to determine the date at which the user last authenticated on a device
   */
  updatedAt: Date
}

export type SignUpData = SignUpInput & {
  hcaptchaResult?: HcaptchaVerifyResult
  inviteCode?: InviteCode
}

// Passkey types for WebAuthn support
export type PasskeyCredential = {
  id: string
  publicKey: string // base64url encoded
  counter: number
  transports: string[] | null
  deviceType: 'singleDevice' | 'multiDevice' | null
  backedUp: boolean
  name: string
  createdAt: string
  lastUsedAt: string | null
}

export type PasskeyRegistrationOptions = {
  challenge: string
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>
  timeout?: number
  excludeCredentials?: Array<{
    id: string
    type: 'public-key'
    transports?: string[]
  }>
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform'
    residentKey?: 'discouraged' | 'preferred' | 'required'
    userVerification?: 'discouraged' | 'preferred' | 'required'
  }
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise'
}

export type PasskeyAuthenticationOptions = {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: Array<{
    id: string
    type: 'public-key'
    transports?: string[]
  }>
  userVerification?: 'discouraged' | 'preferred' | 'required'
}

export type PasskeyRegistrationResponse = {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    attestationObject: string
    transports?: string[]
  }
  clientExtensionResults: Record<string, unknown>
  type: 'public-key'
}

export type PasskeyAuthenticationResponse = {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle?: string
  }
  clientExtensionResults: Record<string, unknown>
  type: 'public-key'
}

export interface AccountStore {
  /**
   * @throws {HandleUnavailableError} - To indicate that the handle is already taken
   * @throws {InvalidRequestError} - To indicate that some data is invalid
   */
  createAccount(data: CreateAccountData): Awaitable<Account>

  /**
   * @throws {InvalidRequestError} - When the credentials are not valid
   * @throws {SecondAuthenticationFactorRequiredError} - To indicate that an {@link SecondAuthenticationFactorRequiredError.type} is required in the credentials
   */
  authenticateAccount(data: AuthenticateAccountData): Awaitable<Account>

  /**
   * Add a client & scopes to the list of authorized clients for the given account.
   */
  setAuthorizedClient(
    sub: Sub,
    clientId: ClientId,
    data: AuthorizedClientData,
  ): Awaitable<void>

  /**
   * @throws {InvalidRequestError} - When the credentials are not valid
   */
  getAccount(sub: Sub): Awaitable<{
    account: Account
    authorizedClients: AuthorizedClients
  }>

  /**
   * @param data.requestId - If provided, the inserted account must be bound to
   * that particular requestId.
   *
   * @note Whenever a particular device account is created, all **unbound**
   * device accounts for the same `deviceId` & `sub` should be deleted.
   *
   * @note When a particular request is deleted (through
   * {@link RequestStore.deleteRequest}), all accounts bound to that request
   * should be deleted as well.
   */
  upsertDeviceAccount(deviceId: DeviceId, sub: Sub): Awaitable<void>

  /**
   * @param requestId - If provided, the result must either have the same
   * requestId, or not be bound to a particular requestId. If `null`, the
   * result must not be bound to a particular requestId.
   * @throws {InvalidRequestError} - Instead of returning `null` in order to
   * provide a custom error message
   */
  getDeviceAccount(
    deviceId: DeviceId,
    sub: Sub,
  ): Awaitable<DeviceAccount | null>

  /**
   * Removes *all* the unbound device-accounts associated with the given device
   * & account.
   *
   * @note Noop if the device-account is not found.
   */
  removeDeviceAccount(deviceId: DeviceId, sub: Sub): Awaitable<void>

  /**
   * @returns **all** the device accounts that match the {@link requestId}
   * criteria and given {@link filter}.
   */
  listDeviceAccounts(
    filter: { sub: Sub } | { deviceId: DeviceId },
  ): Awaitable<DeviceAccount[]>

  resetPasswordRequest(
    data: ResetPasswordRequestInput,
  ): Awaitable<null | Account>

  resetPasswordConfirm(
    data: ResetPasswordConfirmInput,
  ): Awaitable<null | Account>

  /**
   * @throws {HandleUnavailableError} - To indicate that the handle is already taken
   */
  verifyHandleAvailability(handle: string): Awaitable<void>
}

export const isAccountStore = buildInterfaceChecker<AccountStore>([
  'createAccount',
  'authenticateAccount',
  'setAuthorizedClient',
  'getAccount',
  'upsertDeviceAccount',
  'getDeviceAccount',
  'removeDeviceAccount',
  'listDeviceAccounts',
  'resetPasswordRequest',
  'resetPasswordConfirm',
  'verifyHandleAvailability',
])

export function asAccountStore<V>(implementation: V): V & AccountStore {
  if (!implementation || !isAccountStore(implementation)) {
    throw new Error('Invalid AccountStore implementation')
  }
  return implementation
}

/**
 * Optional interface for passkey (WebAuthn) support.
 * Implementations can provide this interface to enable passkey authentication.
 */
export interface PasskeyStore {
  /**
   * Generate registration options for creating a new passkey
   * @param sub - The account identifier (DID)
   * @param userName - Human-readable identifier for the account
   */
  getPasskeyRegistrationOptions(
    sub: Sub,
    userName: string,
  ): Awaitable<PasskeyRegistrationOptions>

  /**
   * Verify and store a new passkey registration
   * @param sub - The account identifier
   * @param response - The WebAuthn registration response from the client
   * @param name - User-friendly name for this passkey
   */
  verifyPasskeyRegistration(
    sub: Sub,
    response: PasskeyRegistrationResponse,
    name: string,
  ): Awaitable<PasskeyCredential>

  /**
   * Generate authentication options for passkey sign-in
   * @param sub - Optional account identifier. If provided, only that user's passkeys are allowed.
   *              If not provided, any discoverable credential can be used.
   */
  getPasskeyAuthenticationOptions(
    sub?: Sub,
  ): Awaitable<PasskeyAuthenticationOptions & { sessionKey: string }>

  /**
   * Verify a passkey authentication response
   * @param sessionKey - The session key from getPasskeyAuthenticationOptions
   * @param response - The WebAuthn authentication response from the client
   * @returns The authenticated account and passkey info
   */
  verifyPasskeyAuthentication(
    sessionKey: string,
    response: PasskeyAuthenticationResponse,
  ): Awaitable<{ account: Account; passkey: PasskeyCredential }>

  /**
   * List all passkeys for an account
   */
  listPasskeys(sub: Sub): Awaitable<PasskeyCredential[]>

  /**
   * Delete a passkey
   * @returns true if the passkey was deleted, false if not found
   */
  deletePasskey(sub: Sub, credentialId: string): Awaitable<boolean>

  /**
   * Get the number of passkeys for an account
   */
  getPasskeyCount(sub: Sub): Awaitable<number>
}

export const isPasskeyStore = buildInterfaceChecker<PasskeyStore>([
  'getPasskeyRegistrationOptions',
  'verifyPasskeyRegistration',
  'getPasskeyAuthenticationOptions',
  'verifyPasskeyAuthentication',
  'listPasskeys',
  'deletePasskey',
  'getPasskeyCount',
])

export function asPasskeyStore<V>(
  implementation: V,
): (V & PasskeyStore) | null {
  if (!implementation || !isPasskeyStore(implementation)) {
    return null
  }
  return implementation
}
