import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { Cross2Icon, ExitIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { UAParser } from 'ua-parser-js'
import type { ActiveAccountSession, ActiveOAuthSession, PasskeyCredential } from '#/api'
import * as Admonition from '#/components/Admonition'
import { Avatar } from '#/components/Avatar'
import { Button } from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Forms from '#/components/forms'
import { InlineLink } from '#/components/Link'
import { Loader } from '#/components/Loader'
import { Prompt } from '#/components/Prompt'
import { useToast } from '#/components/Toast'
import { useAccountSessionsQuery } from '#/data/useAccountSessionsQuery'
import { useAddPasskeyMutation } from '#/data/useAddPasskeyMutation'
import { useClientName } from '#/data/useClientName'
import { useDeletePasskeyMutation } from '#/data/useDeletePasskeyMutation'
import { useFriendlyClientId } from '#/data/useFriendlyClientId'
import { useOAuthSessionsQuery } from '#/data/useOAuthSessionsQuery'
import { usePasskeyAvailableQuery } from '#/data/usePasskeyAvailableQuery'
import { usePasskeysQuery } from '#/data/usePasskeysQuery'
import { useRevokeAccountSessionMutation } from '#/data/useRevokeAccountSessionMutation'
import { useRevokeOAuthSessionMutation } from '#/data/useRevokeOAuthSessionMutation'

export const Route = createFileRoute('/account/_appLayout/$sub')({
  component: RouteComponent,
})

function RouteComponent() {
  const { _ } = useLingui()

  return (
    <>
      <title>{_(msg`Your account`)}</title>
      <AccountHome />
    </>
  )
}

export function AccountHome() {
  const { _ } = useLingui()
  const { sub } = Route.useParams()
  const { data: sessions, error, isLoading } = useOAuthSessionsQuery({ sub })
  const {
    data: accountSessions,
    error: accountSessionsError,
    isLoading: accountSessionsIsLoading,
  } = useAccountSessionsQuery({ sub })

  return (
    <>
      <ul className="text-text-light flex items-center space-x-2 text-sm">
        <li>
          <InlineLink to="/account" className="text-text-light underline">
            <Trans>Home</Trans>
          </InlineLink>
        </li>
        <li className="text-custom-primary">/</li>
        <li>
          <Trans>Your account</Trans>
        </li>
      </ul>

      <h2 className="text-custom-primary text-primary pb-4 pt-8 text-xl font-bold">
        <Trans>Connected apps</Trans>
      </h2>

      <p className="text-text-light mb-2">
        <Trans>
          This is a list of all the applications you have authorized to access
          your account.
        </Trans>
      </p>

      {isLoading ? (
        <Loader size="lg" fill="var(--color-contrast-300)" />
      ) : error || !sessions ? (
        <Admonition.Default
          variant="error"
          text={_(msg`Failed to load connected apps`)}
        />
      ) : sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <ApplicationSessionCard
              key={session.tokenId}
              sub={sub}
              session={session}
            />
          ))}
        </div>
      ) : (
        <Admonition.Default
          variant="info"
          title={_(msg`No connected apps`)}
          text={_(
            msg`It appears that you haven’t used this account to sign in to any apps yet.`,
          )}
        />
      )}

      <h2 className="text-custom-primary pb-4 pt-8 text-xl font-bold">
        <Trans>My devices</Trans>
      </h2>

      <p className="text-text-light mb-2">
        <Trans>
          This is a list of all the devices you have used to sign in to your
          account. New apps can be authorized from any of these devices. If you
          believe that your account has been compromised, we recommend that you
          revoke access to all devices.
        </Trans>
      </p>

      {accountSessionsIsLoading ? (
        <Loader size="lg" fill="var(--color-contrast-300)" />
      ) : accountSessionsError || !accountSessions ? (
        <Admonition.Default
          variant="error"
          text={_(msg`Failed to load devices`)}
        />
      ) : accountSessions.length > 0 ? (
        <div className="space-y-3">
          {accountSessions.map((session) => (
            <AccountSessionCard
              key={`${sub}@${session.deviceId}`}
              sub={sub}
              session={session}
            />
          ))}
        </div>
      ) : (
        <Admonition.Default
          variant="info"
          title={_(msg`No devices`)}
          text={_(msg`Looks like you aren't logged in on any other devices.`)}
        />
      )}

      <PasskeysSection sub={sub} />
    </>
  )
}

function ApplicationSessionCard({
  session: { clientId, clientMetadata, tokenId },
  sub,
}: {
  session: ActiveOAuthSession
  sub: string
}) {
  const { _ } = useLingui()
  const { show } = useToast()
  const { mutateAsync: revokeSessions, isPending } =
    useRevokeOAuthSessionMutation()

  const friendlyClientId = useFriendlyClientId({
    clientId,
  })
  const clientName = useClientName({
    clientId,
    clientMetadata,
  })

  const revoke = async () => {
    try {
      await revokeSessions({ sub, tokenId })
      show({
        variant: 'success',
        title: _(msg`Successfully signed out`),
        duration: 2e3,
      })
    } catch (e) {
      show({
        variant: 'error',
        title: _(msg`Failed to sign out`),
        duration: 2e3,
      })
    }
  }

  return (
    <div className="bg-contrast-25 dark:bg-contrast-50 border-contrast-50 dark:border-contrast-100 flex items-start justify-between space-x-4 rounded-lg border p-4">
      <div className="flex flex-1 items-center space-x-2 truncate">
        <Avatar
          size={40}
          src={clientMetadata?.logo_uri}
          displayName={clientName}
        />
        <div className="flex-1 truncate">
          <h3 className="truncate font-bold leading-snug">{clientName}</h3>
          <p className="text-text-light truncate text-sm leading-snug">
            {friendlyClientId}
          </p>
        </div>
      </div>
      <div>
        <Prompt
          title={
            clientName !== clientId
              ? _(msg`Revoke access to ${clientName}`)
              : _(msg`Revoke access to this application`)
          }
          description={_(
            msg`Are you sure you want to revoke access? This application won't be able to access your account anymore.`,
          )}
          confirmCTA={_(msg`Revoke access`)}
          onConfirm={revoke}
        >
          <Button color="secondary" disabled={isPending}>
            <Button.Text>
              <Trans>Revoke access</Trans>
            </Button.Text>
            <Cross2Icon width={16} />
          </Button>
        </Prompt>
      </div>
    </div>
  )
}

function AccountSessionCard({
  session,
  sub,
}: {
  session: ActiveAccountSession
  sub: string
}) {
  const { show } = useToast()
  const { _, i18n } = useLingui()
  const { mutateAsync: revokeSessions, isPending } =
    useRevokeAccountSessionMutation()

  const { userAgent, lastSeenAt, ipAddress } = session.deviceMetadata

  const ua = useMemo(() => {
    if (!userAgent) {
      return null
    }
    return UAParser(userAgent)
  }, [userAgent])

  const remove = async () => {
    try {
      await revokeSessions({ sub, deviceId: session.deviceId })
      show({
        variant: 'success',
        title: _(msg`Successfully removed device`),
        duration: 2e3,
      })
    } catch (e) {
      show({
        variant: 'error',
        title: _(msg`Failed to remove device`),
        duration: 2e3,
      })
    }
  }

  const lastUsed = useMemo(() => {
    // Fool-proofing
    if (!lastSeenAt) return undefined

    const date = new Date(lastSeenAt)

    // Fool-proofing
    if (isNaN(date.getTime())) return lastSeenAt

    return i18n.date(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  }, [session])

  return (
    <div className="border-contrast-50 dark:border-contrast-100 flex flex-wrap items-center justify-between space-x-4 border-t px-2 pt-3">
      <div className="flex min-w-36 flex-1 flex-col space-x-2 truncate">
        <p className="truncate font-semibold">
          {ua ? (
            ua.device.is('mobile') ? (
              [ua.os.name].filter(Boolean).join(' • ')
            ) : (
              [ua.os.name, ua.browser.name].filter(Boolean).join(' • ')
            )
          ) : (
            <Trans>Unknown user agent</Trans>
          )}
        </p>
        <p className="truncate text-sm">
          <span className="text-text-light">
            {lastUsed}
            {' • '}
          </span>
          <span className="text-warning-600 truncate font-mono">
            {ipAddress}
          </span>
        </p>
      </div>
      {session.isCurrentDevice && (
        <div className="bg-contrast-25 dark:bg-contrast-50 text-text-light min-w-max shrink-0 grow-0 rounded-full px-2 py-1 text-xs">
          <Trans>This device</Trans>
        </div>
      )}
      <Prompt
        title={_(msg`Remove this device`)}
        description={_(msg`Are you sure you want to remove this device?`)}
        confirmCTA={_(msg`Sign out`)}
        onConfirm={remove}
      >
        <Button
          color="secondary"
          size="sm"
          className="min-w-max shrink-0 grow-0"
          disabled={isPending}
        >
          <Button.Text>
            <Trans>Sign out</Trans>
          </Button.Text>
          <ExitIcon width={20} />
        </Button>
      </Prompt>
    </div>
  )
}

function PasskeysSection({ sub }: { sub: string }) {
  const { _ } = useLingui()
  const { show } = useToast()
  const { data: passkeyAvailable, isLoading: availableLoading } =
    usePasskeyAvailableQuery()
  const { data: passkeys, error, isLoading } = usePasskeysQuery({ sub })
  const { mutateAsync: deletePasskey, isPending: isDeleting } =
    useDeletePasskeyMutation()
  const { mutateAsync: addPasskey, isPending: isAdding } =
    useAddPasskeyMutation()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Don't show section if passkeys aren't available
  if (availableLoading || !passkeyAvailable) {
    return null
  }

  const handleAdd = async () => {
    const name = newPasskeyName.trim() || sub
    try {
      await addPasskey({ sub, name })
      show({
        variant: 'success',
        title: _(msg`Passkey added successfully`),
        duration: 2e3,
      })
      setIsAddDialogOpen(false)
      setNewPasskeyName('')
    } catch (e) {
      show({
        variant: 'error',
        title:
          e instanceof Error ? e.message : _(msg`Failed to add passkey`),
        duration: 3e3,
      })
    }
  }

  const handleDelete = async (credentialId: string) => {
    if (passkeys && passkeys.length <= 1) {
      show({
        variant: 'error',
        title: _(msg`Cannot delete the last passkey`),
        duration: 2e3,
      })
      return
    }

    setDeletingId(credentialId)
    try {
      await deletePasskey({ sub, credentialId })
      show({
        variant: 'success',
        title: _(msg`Passkey deleted successfully`),
        duration: 2e3,
      })
    } catch (e) {
      show({
        variant: 'error',
        title: _(msg`Failed to delete passkey`),
        duration: 2e3,
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between pb-4 pt-8">
        <h2 className="text-custom-primary text-xl font-bold">
          <Trans>Passkeys</Trans>
        </h2>
        <Dialog.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Dialog.Trigger asChild>
            <Button color="secondary" size="sm">
              <PlusIcon width={16} />
              <Button.Text>
                <Trans>Add passkey</Trans>
              </Button.Text>
            </Button>
          </Dialog.Trigger>
          <Dialog.Outer>
            <Dialog.Inner>
              <Dialog.Close />
              <Dialog.Title className="text-lg font-bold mb-2">
                <Trans>Add a passkey</Trans>
              </Dialog.Title>
              <Dialog.Description className="text-text-light mb-4">
                <Trans>
                  Passkeys let you sign in faster and more securely using Face
                  ID, Touch ID, or Windows Hello.
                </Trans>
              </Dialog.Description>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAdd()
                }}
              >
                <Forms.Fieldset>
                  <Forms.Label htmlFor="passkey-name">
                    <Trans>Passkey name (optional)</Trans>
                  </Forms.Label>
                  <Forms.Text
                    id="passkey-name"
                    placeholder={sub}
                    value={newPasskeyName}
                    onChange={(e) => setNewPasskeyName(e.target.value)}
                    disabled={isAdding}
                  />
                </Forms.Fieldset>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    color="secondary"
                    disabled={isAdding}
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    <Button.Text>
                      <Trans>Cancel</Trans>
                    </Button.Text>
                  </Button>
                  <Button type="submit" color="primary" disabled={isAdding}>
                    <Button.Text>
                      {isAdding ? (
                        <Trans>Adding...</Trans>
                      ) : (
                        <Trans>Add passkey</Trans>
                      )}
                    </Button.Text>
                  </Button>
                </div>
              </form>
            </Dialog.Inner>
          </Dialog.Outer>
        </Dialog.Root>
      </div>

      <p className="text-text-light mb-2">
        <Trans>
          Passkeys let you sign in faster and more securely using Face ID,
          Touch ID, or Windows Hello instead of your password.
        </Trans>
      </p>

      {isLoading ? (
        <Loader size="lg" fill="var(--color-contrast-300)" />
      ) : error || !passkeys ? (
        <Admonition.Default
          variant="error"
          text={_(msg`Failed to load passkeys`)}
        />
      ) : passkeys.length > 0 ? (
        <div className="space-y-2">
          {passkeys.map((passkey) => (
            <PasskeyCard
              key={passkey.id}
              passkey={passkey}
              onDelete={() => handleDelete(passkey.id)}
              isDeleting={deletingId === passkey.id}
              canDelete={passkeys.length > 1}
            />
          ))}
        </div>
      ) : (
        <Admonition.Default
          variant="info"
          title={_(msg`No passkeys`)}
          text={_(
            msg`You haven't added any passkeys yet. Add one to sign in faster.`,
          )}
        />
      )}
    </>
  )
}

function PasskeyCard({
  passkey,
  onDelete,
  isDeleting,
  canDelete,
}: {
  passkey: PasskeyCredential
  onDelete: () => void
  isDeleting: boolean
  canDelete: boolean
}) {
  const { _, i18n } = useLingui()

  const lastUsed = useMemo(() => {
    if (!passkey.lastUsedAt) return null
    const date = new Date(passkey.lastUsedAt)
    if (isNaN(date.getTime())) return passkey.lastUsedAt
    return i18n.date(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  }, [passkey.lastUsedAt, i18n])

  const createdAt = useMemo(() => {
    if (!passkey.createdAt) return null
    const date = new Date(passkey.createdAt)
    if (isNaN(date.getTime())) return passkey.createdAt
    return i18n.date(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
  }, [passkey.createdAt, i18n])

  return (
    <div className="bg-contrast-25 dark:bg-contrast-50 border-contrast-50 dark:border-contrast-100 flex items-center justify-between space-x-4 rounded-lg border p-4">
      <div className="flex flex-1 items-center space-x-3 truncate">
        <div className="bg-custom-primary/10 text-custom-primary flex h-10 w-10 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10,3 8.34,3.42 6.42,4.41C6.19,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.68 5.96,3.54C8.04,2.46 9.87,2 12,2C14.13,2 15.96,2.46 18.04,3.54C18.29,3.68 18.38,3.97 18.25,4.21C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79M16.92,19.94C15.73,19.94 14.68,19.64 13.82,19.05C12.33,18.04 11.44,16.4 11.44,14.66A0.5,0.5 0 0,1 11.94,14.16A0.5,0.5 0 0,1 12.44,14.66C12.44,16.07 13.16,17.4 14.38,18.22C15.09,18.7 15.92,18.93 16.92,18.93C17.16,18.93 17.56,18.9 17.96,18.83C18.23,18.78 18.5,18.96 18.54,19.24C18.59,19.5 18.41,19.77 18.13,19.82C17.56,19.93 17.06,19.94 16.92,19.94M14.91,22C14.87,22 14.82,22 14.78,22C13.19,21.54 12.15,20.95 11.06,19.88C9.66,18.5 8.89,16.64 8.89,14.66C8.89,13.04 10.27,11.72 11.97,11.72C13.67,11.72 15.05,13.04 15.05,14.66C15.05,15.73 16,16.6 17.13,16.6C18.28,16.6 19.21,15.73 19.21,14.66C19.21,10.89 15.96,7.83 11.96,7.83C9.12,7.83 6.5,9.41 5.35,11.86C4.96,12.67 4.76,13.62 4.76,14.66C4.76,15.44 4.83,16.67 5.43,18.27C5.53,18.53 5.4,18.82 5.14,18.91C4.88,19 4.59,18.87 4.5,18.62C4,17.31 3.77,16 3.77,14.66C3.77,13.46 4,12.37 4.45,11.42C5.78,8.63 8.73,6.82 11.96,6.82C16.5,6.82 20.21,10.33 20.21,14.65C20.21,16.27 18.83,17.59 17.13,17.59C15.43,17.59 14.05,16.27 14.05,14.65C14.05,13.58 13.12,12.71 11.97,12.71C10.82,12.71 9.89,13.58 9.89,14.65C9.89,16.36 10.55,17.96 11.76,19.16C12.71,20.1 13.62,20.62 15.03,21C15.3,21.08 15.45,21.36 15.38,21.62C15.33,21.85 15.12,22 14.91,22Z" />
          </svg>
        </div>
        <div className="flex-1 truncate">
          <h3 className="truncate font-bold leading-snug">{passkey.name}</h3>
          <p className="text-text-light truncate text-sm leading-snug">
            {lastUsed ? (
              <Trans>Last used {lastUsed}</Trans>
            ) : (
              <Trans>Created {createdAt}</Trans>
            )}
            {passkey.backedUp && (
              <span className="text-success-600 ml-2">
                <Trans>• Synced</Trans>
              </span>
            )}
          </p>
        </div>
      </div>
      <Prompt
        title={_(msg`Delete this passkey`)}
        description={_(
          msg`Are you sure you want to delete this passkey? You won't be able to use it to sign in anymore.`,
        )}
        confirmCTA={_(msg`Delete`)}
        onConfirm={onDelete}
      >
        <Button
          color="secondary"
          size="sm"
          disabled={isDeleting || !canDelete}
          title={
            !canDelete
              ? _(msg`Cannot delete the last passkey`)
              : _(msg`Delete passkey`)
          }
        >
          <TrashIcon width={16} />
        </Button>
      </Prompt>
    </div>
  )
}
