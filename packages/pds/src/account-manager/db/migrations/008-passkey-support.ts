import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('passkey')
    .addColumn('did', 'varchar', (col) => col.notNull())
    .addColumn('credentialId', 'varchar', (col) => col.primaryKey())
    .addColumn('credentialPublicKey', 'text', (col) => col.notNull())
    .addColumn('counter', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('transports', 'text')
    .addColumn('deviceName', 'varchar')
    .addColumn('backupEligible', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('backupState', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('userHandle', 'varchar', (col) => col.notNull().unique())
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('lastUsedAt', 'varchar')
    .execute()

  await db.schema
    .createIndex('passkey_did_idx')
    .on('passkey')
    .column('did')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('passkey').execute()
}
