import { Selectable } from 'kysely'

export interface Passkey {
  id: string // credential ID (base64url)
  did: string
  publicKey: string // public key (base64url)
  counter: number
  transports: string | null // JSON array of transports
  deviceType: string | null // "singleDevice" | "multiDevice"
  backedUp: 0 | 1
  name: string // user-friendly name
  createdAt: string
  lastUsedAt: string | null
}

export type PasskeyEntry = Selectable<Passkey>

export const tableName = 'passkey'

export type PartialDB = { [tableName]: Passkey }
