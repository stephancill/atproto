import { Trans, useLingui } from '@lingui/react/macro'
import { useCallback, useState } from 'react'
import {
  usePasskeyAvailable,
  usePasskeyRegister,
} from '../../hooks/use-passkey.ts'
import { Button } from '../forms/button.tsx'
import { InputText } from '../forms/input-text.tsx'
import { FingerprintIcon, PencilIcon, CheckIcon } from '../utils/icons.tsx'

export type PasskeyRegisterPromptProps = {
  sub: string
  /** Default name for the passkey (typically the user's handle) */
  defaultName: string
  /** Ephemeral token for authentication (required if "remember me" was not checked) */
  bearer?: string
  onRegisterSuccess?: () => void
  onSkip?: () => void
}

/**
 * A prompt to register a passkey after successful sign-in.
 * Shows only when passkeys are available and the user doesn't have one yet.
 */
export function PasskeyRegisterPrompt({
  sub,
  defaultName,
  bearer,
  onRegisterSuccess,
  onSkip,
}: PasskeyRegisterPromptProps) {
  const { t } = useLingui()
  const { available, loading: availableLoading } = usePasskeyAvailable()
  const { register, isRegistering, error, reset } = usePasskeyRegister()
  const [isEditing, setIsEditing] = useState(false)
  const [customName, setCustomName] = useState(defaultName)

  const passkeyName = customName.trim() || defaultName

  const handleRegister = useCallback(async () => {
    reset()
    try {
      await register(sub, passkeyName, bearer)
      onRegisterSuccess?.()
    } catch {
      // Error is handled by usePasskeyRegister hook
    }
  }, [sub, passkeyName, register, reset, onRegisterSuccess, bearer])

  // Don't show if passkeys aren't available
  if (availableLoading || !available) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <FingerprintIcon className="text-primary h-8 w-8 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            <Trans>Add a Passkey</Trans>
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <Trans>
              Sign in faster with Face ID, Touch ID, or Windows Hello
            </Trans>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          <Trans>Name:</Trans>
        </span>
        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <InputText
              name="passkey-name"
              className="flex-1"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={isRegistering}
              autoFocus
            />
            <button
              type="button"
              className="text-primary rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={() => setIsEditing(false)}
              aria-label={t`Done editing`}
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {passkeyName}
            </span>
            <button
              type="button"
              className="text-slate-400 rounded p-1 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              onClick={() => setIsEditing(true)}
              aria-label={t`Edit name`}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          color="primary"
          onClick={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <Trans>Adding Passkey...</Trans>
          ) : (
            <Trans>Add Passkey</Trans>
          )}
        </Button>
        {onSkip && (
          <Button
            type="button"
            color="grey"
            onClick={onSkip}
            disabled={isRegistering}
          >
            <Trans>Not now</Trans>
          </Button>
        )}
      </div>
    </div>
  )
}
