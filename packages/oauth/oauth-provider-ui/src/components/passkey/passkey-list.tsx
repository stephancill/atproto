import { Trans, useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useState } from 'react'
import type { PasskeyCredential } from '@atproto/oauth-provider-api'
import { Api } from '../../lib/api.ts'
import { Button } from '../forms/button.tsx'
import { FingerprintIcon, XMarkIcon } from '../utils/icons.tsx'

const api = new Api()

export type PasskeyListProps = {
  sub: string
  onAddPasskey?: () => void
}

/**
 * A component to list and manage passkeys for an account.
 */
export function PasskeyList({ sub, onAddPasskey }: PasskeyListProps) {
  const { t } = useLingui()
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPasskeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.fetch('GET', '/passkey/list', { sub })
      setPasskeys(result.passkeys)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load passkeys')
    } finally {
      setLoading(false)
    }
  }, [sub])

  useEffect(() => {
    loadPasskeys()
  }, [loadPasskeys])

  const handleDelete = useCallback(
    async (credentialId: string) => {
      if (passkeys.length <= 1) {
        setError(t`Cannot delete the last passkey`)
        return
      }

      setDeletingId(credentialId)
      setError(null)
      try {
        await api.fetch('POST', '/passkey/delete', { sub, credentialId })
        setPasskeys((prev) => prev.filter((p) => p.id !== credentialId))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete passkey',
        )
      } finally {
        setDeletingId(null)
      }
    },
    [sub, passkeys.length, t],
  )

  if (loading) {
    return (
      <div className="py-4 text-center text-slate-500 dark:text-slate-400">
        <Trans>Loading passkeys...</Trans>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          <Trans>Passkeys</Trans>
        </h3>
        {onAddPasskey && (
          <Button type="button" color="grey" onClick={onAddPasskey}>
            <Trans>Add Passkey</Trans>
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {passkeys.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Trans>No passkeys registered</Trans>
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FingerprintIcon className="h-5 w-5 flex-shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {passkey.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {passkey.lastUsedAt ? (
                      <Trans>
                        Last used{' '}
                        {new Date(passkey.lastUsedAt).toLocaleDateString()}
                      </Trans>
                    ) : (
                      <Trans>Never used</Trans>
                    )}
                    {passkey.backedUp && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        <Trans>• Synced</Trans>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                color="grey"
                shape="circle"
                onClick={() => handleDelete(passkey.id)}
                disabled={deletingId === passkey.id || passkeys.length <= 1}
                aria-label={t`Delete passkey`}
                title={
                  passkeys.length <= 1
                    ? t`Cannot delete the last passkey`
                    : t`Delete passkey`
                }
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
