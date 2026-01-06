import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server'
import { AccountDb } from '../db'
import { PasskeyEntry } from '../db/schema/passkey'
import * as passkeySchema from '../db/schema/passkey'
import { ActorAccount } from './account'

export type PasskeyChallenge = {
  challenge: string
  options: RegistrationResponseJSON | AuthenticationResponseJSON
}

export async function generatePasskeyRegistrationChallenge(
  db: AccountDb,
  username: string,
  rpId: string,
  rpName: string,
  timeout: number,
): Promise<RegistrationResponseJSON> {
  const user = await db.db
    .selectFrom('actor')
    .innerJoin('account', 'actor.did', 'account.did')
    .select(['actor.did', 'actor.handle'])
    .where('account.email', '=', username.toLowerCase())
    .or('actor.handle', '=', username.toLowerCase())
    .executeTakeFirst()

  if (!user) {
    throw new Error('Account not found')
  }

  const userHandle = generateUserHandle(user.did)
  
  const existingPasskeys = await listPasskeysByDid(db, user.did)
  const deviceName = `Passkey #${existingPasskeys.length + 1}`

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: userHandle,
    userName: user.handle,
    userDisplayName: user.handle,
    timeout,
    excludeCredentials: existingPasskeys.map(p => ({
      id: p.credentialId,
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  return options
}

export async function verifyPasskeyRegistration(
  db: AccountDb,
  username: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  rpId: string,
  deviceName?: string,
): Promise<{ did: string }> {
  const user = await db.db
    .selectFrom('actor')
    .innerJoin('account', 'actor.did', 'account.did')
    .select(['actor.did'])
    .where('account.email', '=', username.toLowerCase())
    .or('actor.handle', '=', username.toLowerCase())
    .executeTakeFirst()

  if (!user) {
    throw new Error('Account not found')
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: new URL(rpId).origin,
    expectedRPID: rpId,
  })

  if (!verification.verified) {
    throw new Error('Passkey verification failed')
  }

  const { registrationInfo } = verification
  if (!registrationInfo) {
    throw new Error('Missing registration info')
  }

  const userHandle = generateUserHandle(user.did)
  const existingPasskeys = await listPasskeysByDid(db, user.did)
  const finalDeviceName = deviceName || `Passkey #${existingPasskeys.length + 1}`

  await db.executeWithRetry(
    db.db
      .insertInto('passkey')
      .values({
        did: user.did,
        credentialId: registrationInfo.credentialID,
        credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64'),
        counter: registrationInfo.counter,
        transports: JSON.stringify(registrationInfo.credentialDeviceType),
        deviceName: finalDeviceName,
        backupEligible: registrationInfo.credentialBackedUp ? 1 : 0,
        backupState: registrationInfo.credentialBackedUp ? 1 : 0,
        userHandle,
        createdAt: new Date().toISOString(),
      })
      .execute()
  )

  return { did: user.did }
}

export async function generatePasskeyAuthenticationChallenge(
  db: AccountDb,
  username: string,
  rpId: string,
  timeout: number,
): Promise<AuthenticationResponseJSON> {
  const user = await db.db
    .selectFrom('actor')
    .innerJoin('account', 'actor.did', 'account.did')
    .select(['actor.did'])
    .where('account.email', '=', username.toLowerCase())
    .or('actor.handle', '=', username.toLowerCase())
    .executeTakeFirst()

  if (!user) {
    throw new Error('Account not found')
  }

  const passkeys = await listPasskeysByDid(db, user.did)
  if (passkeys.length === 0) {
    throw new Error('No passkeys found for account')
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    timeout,
    allowCredentials: passkeys.map(p => ({
      id: p.credentialId,
      type: 'public-key',
    })),
    userVerification: 'preferred',
  })

  return options
}

export async function verifyPasskeyAuthentication(
  db: AccountDb,
  username: string,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  rpId: string,
): Promise<{ did: string; actorAccount: ActorAccount }> {
  const user = await db.db
    .selectFrom('actor')
    .selectAll('actor')
    .innerJoin('account', 'actor.did', 'account.did')
    .where('account.email', '=', username.toLowerCase())
    .or('actor.handle', '=', username.toLowerCase())
    .executeTakeFirst()

  if (!user) {
    throw new Error('Account not found')
  }

  const passkey = await db.db
    .selectFrom('passkey')
    .selectAll()
    .where('did', '=', user.did)
    .where('credentialId', '=', response.id)
    .executeTakeFirst()

  if (!passkey) {
    throw new Error('Passkey not found')
  }

  const credentialPublicKey = Buffer.from(passkey.credentialPublicKey, 'base64')

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: new URL(rpId).origin,
    expectedRPID: rpId,
    credential: {
      id: passkey.credentialId,
      publicKey: credentialPublicKey,
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : [],
    },
  })

  if (!verification.verified) {
    throw new Error('Passkey verification failed')
  }

  const { authenticationInfo } = verification
  if (!authenticationInfo) {
    throw new Error('Missing authentication info')
  }

  await db.executeWithRetry(
    db.db
      .updateTable('passkey')
      .set({
        counter: authenticationInfo.newCounter,
        lastUsedAt: new Date().toISOString(),
      })
      .where('credentialId', '=', passkey.credentialId)
      .execute()
  )

  return { did: user.did, actorAccount: user }
}

export async function listPasskeysByDid(db: AccountDb, did: string): Promise<PasskeyEntry[]> {
  return await db.db
    .selectFrom('passkey')
    .selectAll()
    .where('did', '=', did)
    .orderBy('createdAt', 'asc')
    .execute()
}

export async function deletePasskey(
  db: AccountDb,
  did: string,
  credentialId: string,
): Promise<void> {
  await db.executeWithRetry(
    db.db
      .deleteFrom('passkey')
      .where('did', '=', did)
      .where('credentialId', '=', credentialId)
      .execute()
  )
}

function generateUserHandle(did: string): string {
  return did.replace('did:', '').replace(':', '-')
}
