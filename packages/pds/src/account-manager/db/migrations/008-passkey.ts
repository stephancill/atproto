import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('passkey')
    .addColumn('id', 'varchar', (col) => col.primaryKey()) // credential ID (base64url)
    .addColumn('did', 'varchar', (col) => col.notNull())
    .addColumn('publicKey', 'varchar', (col) => col.notNull()) // public key (base64url)
    .addColumn('counter', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('transports', 'varchar') // JSON array of transports
    .addColumn('deviceType', 'varchar') // "singleDevice" | "multiDevice"
    .addColumn('backedUp', 'int2', (col) => col.notNull().defaultTo(0)) // 0 | 1
    .addColumn('name', 'varchar', (col) => col.notNull()) // user-friendly name
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('lastUsedAt', 'varchar')
    .execute()

  // Index for looking up passkeys by DID
  await db.schema
    .createIndex('passkey_did_idx')
    .on('passkey')
    .column('did')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('passkey').execute()
}
