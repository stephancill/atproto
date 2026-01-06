import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { clsx } from 'clsx'
import { useState } from 'react'
import { z } from 'zod'
import {
  InvalidCredentialsError,
  SecondAuthenticationFactorRequiredError,
} from '#/api'
import { Button } from '#/components/Button'
import { InlineLink } from '#/components/Link'
import * as Form from '#/components/forms'
import { useDeviceSessionsQuery } from '#/data/useDeviceSessionsQuery'
import { usePasskeyAuthMutation } from '#/data/usePasskeyAuthMutation'
import { usePasskeyAvailableQuery } from '#/data/usePasskeyAvailableQuery'
import { useSignInMutation } from '#/data/useSignInMutation'
import { format2FACode } from '#/util/format2FACode'
import { wait } from '#/util/wait'
import { normalizeAndEnsureValidHandle } from '@atproto/syntax'

export const Route = createFileRoute('/account/_minimalLayout/sign-in')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: sessions } = useDeviceSessionsQuery()
  const { _ } = useLingui()

  return (
    <>
      <title>{_(msg`Sign in`)}</title>
      <div
        className={clsx([
          'mx-auto rounded-lg border p-5 shadow-xl md:p-7 dark:shadow-2xl',
          'border-contrast-25 dark:border-contrast-50 shadow-contrast-500/20 dark:shadow-contrast-0/50',
        ])}
        style={{
          maxWidth: 400,
        }}
      >
        <LoginForm />
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-row justify-center pt-4">
          <InlineLink
            to="/account"
            className="text-text-light inline-block w-full text-center text-sm"
          >
            <Trans>&larr; Back to accounts</Trans>
          </InlineLink>
        </div>
      )}
    </>
  )
}

function LoginForm() {
  const { _ } = useLingui()
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState('')
  const { mutateAsync: signIn } = useSignInMutation()
  const { mutateAsync: passkeyAuth, isPending: isPasskeyPending } =
    usePasskeyAuthMutation()
  const { data: passkeyAvailable } = usePasskeyAvailableQuery()
  const navigate = useNavigate({ from: Route.fullPath })

  const handlePasskeySignIn = async () => {
    setError('')
    try {
      const res = await passkeyAuth({ remember: true })
      await navigate({
        to: '/account/$sub',
        params: res.account,
      })
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError(_(msg`Passkey authentication failed.`))
      }
    }
  }

  const form = useForm({
    defaultValues: {
      identifier: '',
      password: '',
      code: '',
    },
    validators: {
      onSubmit: z.object({
        identifier: z.union([
          z.string().email(),
          z
            .string()
            .transform((v) => (v.startsWith('@') ? v.slice(1) : v))
            .superRefine((v, ctx) => {
              try {
                return normalizeAndEnsureValidHandle(v)
              } catch (err) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: _(msg`Invalid handle`),
                })
              }
            }),
        ]),
        password: z.string().nonempty(_(msg`Password is required`)),
        code: z.string(),
      }),
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        // throw new SecondAuthenticationFactorRequiredError({
        //   error: 'second_authentication_factor_required',
        //   type: 'emailOtp',
        //   hint: value.identifier,
        // })
        // throw new InvalidCredentialsError({
        //   error: 'invalid_request',
        //   error_description: 'Invalid identifier or password',
        // })
        const res = await wait(
          500,
          signIn({
            // @NOTE For some reason, the validator function output is not taken
            // into account here so we have to strip the @ again.
            username: value.identifier.replace(/^@/, ''),
            password: value.password,
            emailOtp: showCode ? value.code : undefined,
          }),
        )
        await navigate({
          to: '/account/$sub',
          params: res.account,
        })
      } catch (e) {
        if (e instanceof SecondAuthenticationFactorRequiredError) {
          setShowCode(true)
        } else if (e instanceof InvalidCredentialsError) {
          setShowCode(false)
          setError(_(msg`Invalid identifier or password.`))
        } else {
          setError(_(msg`An error occurred, please try again.`))
        }
      }
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-custom-primary text-xl font-bold">
        <Trans>Sign in</Trans>
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <Form.Fieldset label={_(msg`Credentials`)}>
          <form.Field
            name="identifier"
            children={(field) => {
              return (
                <Form.Item>
                  <Form.Label name={field.name}>
                    <Trans>Identifier</Trans>
                  </Form.Label>
                  <Form.Text
                    name={field.name}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    spellCheck="false"
                    type="text"
                    value={field.state.value}
                    placeholder={_(msg`@handle or email`)}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <Form.Errors errors={field.state.meta.errors} />
                </Form.Item>
              )
            }}
          />
          <form.Field
            name="password"
            children={(field) => {
              return (
                <Form.Item>
                  <Form.Label name={field.name}>
                    <Trans>Password</Trans>
                  </Form.Label>
                  <Form.Text
                    name={field.name}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="current-password"
                    spellCheck="false"
                    type="password"
                    value={field.state.value}
                    placeholder={_(msg`Password`)}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <Form.Errors errors={field.state.meta.errors} />
                </Form.Item>
              )
            }}
          />

          {showCode && (
            <form.Field
              name="code"
              children={(field) => {
                return (
                  <Form.Item>
                    <Form.Label name={field.name}>
                      <Trans>Code</Trans>
                    </Form.Label>
                    <Form.Text
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                      name={field.name}
                      value={field.state.value}
                      placeholder={_(msg`XXXXX-XXXXX`)}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(format2FACode(e.target.value))
                      }}
                    />
                  </Form.Item>
                )
              }}
            />
          )}

          {error && (
            <ul>
              <Form.Error>{error}</Form.Error>
            </ul>
          )}

          <div className="align-center space-y-3 pt-2">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  disabled={!canSubmit || isSubmitting || isPasskeyPending}
                >
                  <Trans>Sign in</Trans>
                </Button>
              )}
            />

            <InlineLink
              to="/account/reset-password"
              className="text-text-light inline-block w-full text-center text-sm"
            >
              <Trans>Forgot password?</Trans>
            </InlineLink>
          </div>
        </Form.Fieldset>
      </form>

      {passkeyAvailable && (
        <>
          <div className="relative my-4 flex items-center">
            <div className="border-contrast-100 flex-grow border-t" />
            <span className="text-text-light mx-4 flex-shrink text-sm">
              <Trans>or</Trans>
            </span>
            <div className="border-contrast-100 flex-grow border-t" />
          </div>
          <Button
            className="w-full"
            size="lg"
            color="secondary"
            type="button"
            onClick={handlePasskeySignIn}
            disabled={isPasskeyPending}
          >
            <PasskeyIcon className="mr-2 h-5 w-5" />
            {isPasskeyPending ? (
              <Trans>Authenticating...</Trans>
            ) : (
              <Trans>Sign in with Passkey</Trans>
            )}
          </Button>
        </>
      )}
    </div>
  )
}

function PasskeyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10,3 8.34,3.42 6.42,4.41C6.19,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.68 5.96,3.54C8.04,2.46 9.87,2 12,2C14.13,2 15.96,2.46 18.04,3.54C18.29,3.68 18.38,3.97 18.25,4.21C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79M16.92,19.94C15.73,19.94 14.68,19.64 13.82,19.05C12.33,18.04 11.44,16.4 11.44,14.66A0.5,0.5 0 0,1 11.94,14.16A0.5,0.5 0 0,1 12.44,14.66C12.44,16.07 13.16,17.4 14.38,18.22C15.09,18.7 15.92,18.93 16.92,18.93C17.16,18.93 17.56,18.9 17.96,18.83C18.23,18.78 18.5,18.96 18.54,19.24C18.59,19.5 18.41,19.77 18.13,19.82C17.56,19.93 17.06,19.94 16.92,19.94M14.91,22C14.87,22 14.82,22 14.78,22C13.19,21.54 12.15,20.95 11.06,19.88C9.66,18.5 8.89,16.64 8.89,14.66C8.89,13.04 10.27,11.72 11.97,11.72C13.67,11.72 15.05,13.04 15.05,14.66C15.05,15.73 16,16.6 17.13,16.6C18.28,16.6 19.21,15.73 19.21,14.66C19.21,10.89 15.96,7.83 11.96,7.83C9.12,7.83 6.5,9.41 5.35,11.86C4.96,12.67 4.76,13.62 4.76,14.66C4.76,15.44 4.83,16.67 5.43,18.27C5.53,18.53 5.4,18.82 5.14,18.91C4.88,19 4.59,18.87 4.5,18.62C4,17.31 3.77,16 3.77,14.66C3.77,13.46 4,12.37 4.45,11.42C5.78,8.63 8.73,6.82 11.96,6.82C16.5,6.82 20.21,10.33 20.21,14.65C20.21,16.27 18.83,17.59 17.13,17.59C15.43,17.59 14.05,16.27 14.05,14.65C14.05,13.58 13.12,12.71 11.97,12.71C10.82,12.71 9.89,13.58 9.89,14.65C9.89,16.36 10.55,17.96 11.76,19.16C12.71,20.1 13.62,20.62 15.03,21C15.3,21.08 15.45,21.36 15.38,21.62C15.33,21.85 15.12,22 14.91,22Z" />
    </svg>
  )
}
