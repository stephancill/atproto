import { Generated, Selectable } from 'kysely'

export interface Passkey {
  did: string
  credentialId: string
  credentialPublicKey: string
  counter: number
  transports: string | null
  deviceName: string | null
  backupEligible: Generated<0 | 1>
  backupState: Generated<0 | 1>
  userHandle: string
  createdAt: string
  lastUsedAt: string | null
}

export type PasskeyEntry = Selectable<Passkey>

export const tableName = 'passkey'

export type PartialDB = { [tableName]: Passkey }
