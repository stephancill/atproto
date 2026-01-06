import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { createFileRoute, Link } from '@tanstack/react-router'
import { clsx } from 'clsx'
import { usePasskeysQuery } from '#/data/usePasskeysQuery'
import { useDeletePasskeyMutation } from '#/data/useDeletePasskeyMutation'
import { usePasskeyRegisterMutation } from '#/data/usePasskeyRegisterMutation'
import * as Layout from '#/components/Layout'
import { Nav } from '#/components/Nav'
import { PasskeyRegisterButton } from '#/components/PasskeyRegisterButton'
import { useDeviceSessionsQuery } from '#/data/useDeviceSessionsQuery'
import { Route as AccountRoute } from '#/routes/account/_appLayout/$sub'

export const Route = createFileRoute('/account/_appLayout/passkeys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { _ } = useLingui()
  const { sub } = AccountRoute.useParams()
  const { data: sessions } = useDeviceSessionsQuery()
  const activeSession = sessions.find((session) => session.account.sub === sub)
  const { data: passkeys } = usePasskeysQuery(sub)
  const deleteMutation = useDeletePasskeyMutation()
  const registerMutation = usePasskeyRegisterMutation()

  const handleDeletePasskey = async (credentialId: string) => {
    try {
      await deleteMutation.mutateAsync({ sub, credentialId })
    } catch (err) {
      console.error('Failed to delete passkey:', err)
    }
  }

  return (
    <>
      <title>{_(msg`Passkeys`)}</title>
      <Nav />
      <Layout.Center>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              <Trans>Passkeys</Trans>
            </h1>
            <PasskeyRegisterButton
              username={sub}
              onSuccess={() => {
                deleteMutation.reset()
              }}
            />
          </div>

          {passkeys.length === 0 ? (
            <div
              className={clsx(
                'rounded-lg border p-6 text-center',
                'border-contrast-25 dark:border-contrast-50',
              )}
            >
              <p className="text-text-light">
                <Trans>No passkeys registered</Trans>
              </p>
              <p className="text-sm">
                <Trans>
                  Add a passkey to sign in without a password
                </Trans>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.credentialId}
                  className={clsx(
                    'rounded-lg border p-4',
                    'border-contrast-25 dark:border-contrast-50',
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {passkey.deviceName}
                      </h2>
                      <p className="text-sm text-text-light">
                        <Trans>Added:</Trans>{' '}
                        {new Date(passkey.createdAt).toLocaleDateString()}
                      </p>
                      {passkey.lastUsedAt && (
                        <p className="text-xs text-text-light">
                          <Trans>Last used:</Trans>{' '}
                          {new Date(passkey.lastUsedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(passkey.credentialId)}
                      disabled={deleteMutation.isPending}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      <Trans>Remove</Trans>
                    </button>
                  </div>
                  <div className="mt-2 text-sm">
                    <span
                      className={clsx(
                        'inline-block px-2 py-1 rounded-full text-xs',
                        passkey.backupEligible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-contrast-100 text-contrast-700',
                      )}
                    >
                      {passkey.backupEligible ? 'Backup eligible' : 'Device only'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout.Center>
    </>
  )
}
