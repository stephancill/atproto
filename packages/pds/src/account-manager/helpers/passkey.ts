import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server/script/deps'

// Re-export types for use in other modules
export type {
  AuthenticationResponseJSON,
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
}
import { AccountDb } from '../db'
import { PasskeyEntry } from '../db/schema'

export type PasskeyConfig = {
  rpId: string
  rpName: string
  origin: string
}

export type PasskeyCredential = {
  id: string
  publicKey: string // base64url encoded
  counter: number
  transports: AuthenticatorTransportFuture[] | null
  deviceType: CredentialDeviceType | null
  backedUp: boolean
  name: string
  createdAt: string
  lastUsedAt: string | null
}

// Store challenges temporarily (in production, use Redis or similar)
// Using a Map for simplicity - challenges expire after 5 minutes
const challengeStore = new Map<
  string,
  { challenge: string; expiresAt: number }
>()

function setChallenge(key: string, challenge: string): void {
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes
  challengeStore.set(key, { challenge, expiresAt })
}

function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    challengeStore.delete(key)
    return null
  }
  challengeStore.delete(key) // One-time use
  return entry.challenge
}

// Clean up expired challenges periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of challengeStore) {
    if (now > entry.expiresAt) {
      challengeStore.delete(key)
    }
  }
}, 60 * 1000) // Every minute

export async function generatePasskeyRegistrationOptions(
  db: AccountDb,
  config: PasskeyConfig,
  did: string,
  userHandle: string,
  userName: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Get existing passkeys for exclusion
  const existingPasskeys = await getPasskeysByDid(db, did)

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userID: new TextEncoder().encode(did),
    userName: userName,
    userDisplayName: userHandle,
    attestationType: 'none', // We don't need attestation for most use cases
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.id,
      transports: pk.transports
        ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
    },
  })

  // Store challenge for verification
  setChallenge(`reg:${did}`, options.challenge)

  return options
}

export async function verifyPasskeyRegistration(
  db: AccountDb,
  config: PasskeyConfig,
  did: string,
  response: RegistrationResponseJSON,
  name: string,
): Promise<PasskeyCredential> {
  const expectedChallenge = getChallenge(`reg:${did}`)
  if (!expectedChallenge) {
    throw new Error('Registration challenge expired or not found')
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Passkey registration verification failed')
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo

  const now = new Date().toISOString()

  const passkey: PasskeyCredential = {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    transports: response.response.transports ?? null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name,
    createdAt: now,
    lastUsedAt: null,
  }

  // Store in database
  await db.db
    .insertInto('passkey')
    .values({
      id: passkey.id,
      did,
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports
        ? JSON.stringify(passkey.transports)
        : null,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp ? 1 : 0,
      name: passkey.name,
      createdAt: passkey.createdAt,
      lastUsedAt: passkey.lastUsedAt,
    })
    .execute()

  return passkey
}

export async function generatePasskeyAuthenticationOptions(
  db: AccountDb,
  config: PasskeyConfig,
  did?: string,
): Promise<PublicKeyCredentialRequestOptionsJSON & { sessionKey: string }> {
  // If did is provided, get passkeys for that user only
  // Otherwise, allow any passkey (discoverable credentials)
  const allowCredentials = did
    ? (await getPasskeysByDid(db, did)).map((pk) => ({
        id: pk.id,
        transports: pk.transports
          ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[])
          : undefined,
      }))
    : undefined

  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    userVerification: 'preferred',
    allowCredentials,
  })

  // Generate a session key for storing the challenge
  const sessionKey = `auth:${Date.now()}:${Math.random().toString(36).slice(2)}`
  setChallenge(sessionKey, options.challenge)

  return {
    ...options,
    sessionKey,
  }
}

export async function verifyPasskeyAuthentication(
  db: AccountDb,
  config: PasskeyConfig,
  sessionKey: string,
  response: AuthenticationResponseJSON,
): Promise<{ did: string; passkey: PasskeyCredential }> {
  const expectedChallenge = getChallenge(sessionKey)
  if (!expectedChallenge) {
    throw new Error('Authentication challenge expired or not found')
  }

  // Look up the credential
  const credentialId = response.id
  const passkeyRow = await db.db
    .selectFrom('passkey')
    .selectAll()
    .where('id', '=', credentialId)
    .executeTakeFirst()

  if (!passkeyRow) {
    throw new Error('Passkey not found')
  }

  const publicKey = Buffer.from(passkeyRow.publicKey, 'base64url')

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    credential: {
      id: passkeyRow.id,
      publicKey: new Uint8Array(publicKey),
      counter: passkeyRow.counter,
      transports: passkeyRow.transports
        ? (JSON.parse(passkeyRow.transports) as AuthenticatorTransportFuture[])
        : undefined,
    },
  })

  if (!verification.verified) {
    throw new Error('Passkey authentication verification failed')
  }

  // Update counter and lastUsedAt
  const now = new Date().toISOString()
  await db.db
    .updateTable('passkey')
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: now,
    })
    .where('id', '=', credentialId)
    .execute()

  return {
    did: passkeyRow.did,
    passkey: {
      id: passkeyRow.id,
      publicKey: passkeyRow.publicKey,
      counter: verification.authenticationInfo.newCounter,
      transports: passkeyRow.transports
        ? JSON.parse(passkeyRow.transports)
        : null,
      deviceType: passkeyRow.deviceType as CredentialDeviceType | null,
      backedUp: passkeyRow.backedUp === 1,
      name: passkeyRow.name,
      createdAt: passkeyRow.createdAt,
      lastUsedAt: now,
    },
  }
}

export async function getPasskeysByDid(
  db: AccountDb,
  did: string,
): Promise<PasskeyEntry[]> {
  return db.db
    .selectFrom('passkey')
    .selectAll()
    .where('did', '=', did)
    .execute()
}

export async function deletePasskey(
  db: AccountDb,
  did: string,
  credentialId: string,
): Promise<boolean> {
  const result = await db.db
    .deleteFrom('passkey')
    .where('id', '=', credentialId)
    .where('did', '=', did)
    .execute()

  return result.length > 0 && Number(result[0].numDeletedRows) > 0
}

export async function getPasskeyCount(
  db: AccountDb,
  did: string,
): Promise<number> {
  const result = await db.db
    .selectFrom('passkey')
    .select(({ fn }) => fn.count('id').as('count'))
    .where('did', '=', did)
    .executeTakeFirst()

  return Number(result?.count ?? 0)
}
