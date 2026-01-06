import { Trans, useLingui } from '@lingui/react/macro'
import { useCallback, useEffect, useState } from 'react'
import type { CustomizationData, Session } from '@atproto/oauth-provider-api'
import { OAuthPromptMode } from '@atproto/oauth-types'
import {
  LayoutTitlePage,
  LayoutTitlePageProps,
} from '../../components/layouts/layout-title-page.tsx'
import { PasskeyRegisterPrompt } from '../../components/passkey/passkey-register-prompt.tsx'
import { useApi } from '../../hooks/use-api.ts'
import { useBoundDispatch } from '../../hooks/use-bound-dispatch.ts'
import { usePasskeyAvailable } from '../../hooks/use-passkey.ts'
import type { AuthorizeData } from '../../hydration-data'
import { Override } from '../../lib/util.ts'
import { ConsentView } from './consent/consent-view.tsx'
import { ResetPasswordView } from './reset-password/reset-password-view.tsx'
import { SignInView } from './sign-in/sign-in-view.tsx'
import { SignUpView } from './sign-up/sign-up-view.tsx'
import { WelcomeView } from './welcome/welcome-view.tsx'

export type AuthorizeViewProps = Override<
  LayoutTitlePageProps,
  {
    customizationData?: CustomizationData
    authorizeData: AuthorizeData
    initialSessions: readonly Session[]
  }
>

enum View {
  Welcome,
  SignUp,
  SignIn,
  ResetPassword,
  PasskeySetup,
  Consent,
  Done,
}

function getInitialView(
  promptMode: OAuthPromptMode | undefined,
  canSignUp: boolean,
  forceSignIn: boolean,
  hasInitialSessions: boolean,
): (typeof View)[keyof typeof View] {
  if (promptMode === 'create' && canSignUp) {
    return View.SignUp
  } else if (forceSignIn) {
    return View.SignIn
  } else if (!canSignUp || hasInitialSessions) {
    return View.SignIn
  }

  return View.Welcome
}

export function AuthorizeView({
  authorizeData,
  initialSessions,
  customizationData,

  // LayoutTitlePage
  ...props
}: AuthorizeViewProps) {
  const { t } = useLingui()

  const forceSignIn = authorizeData.loginHint != null

  const hasAvailableSessions = Boolean(initialSessions.length)
  const hasAvailableUserDomains = Boolean(
    customizationData?.availableUserDomains?.length,
  )
  const canSignUp = !forceSignIn && hasAvailableUserDomains

  const initialView = getInitialView(
    authorizeData.promptMode,
    hasAvailableUserDomains,
    forceSignIn,
    hasAvailableSessions,
  )

  const [view, setView] = useState<View>(initialView)

  const showDone = useBoundDispatch(setView, View.Done)
  const showSignIn = useBoundDispatch(setView, View.SignIn)
  const showResetPassword = useBoundDispatch(setView, View.ResetPassword)
  const showSignUp = useBoundDispatch(setView, View.SignUp)
  const showPasskeySetup = useBoundDispatch(setView, View.PasskeySetup)
  const showConsent = useBoundDispatch(setView, View.Consent)

  // Track whether passkey enrollment was shown (to avoid showing it twice)
  const [passkeyEnrollmentShown, setPasskeyEnrollmentShown] = useState(false)
  // Track whether the user signed in via passkey (to skip enrollment prompt)
  const [signedInViaPasskey, setSignedInViaPasskey] = useState(false)
  const { available: passkeyAvailable } = usePasskeyAvailable()

  const [resetPasswordHint, setResetPasswordHint] = useState<
    string | undefined
  >(undefined)

  const {
    sessions,
    selectSub,
    doValidateNewHandle,
    doSignUp,
    doSignIn,
    doPasskeySignIn: doPasskeySignInBase,
    doInitiatePasswordReset,
    doConfirmResetPassword,
    doConsent,
    doReject,
  } = useApi({
    sessions: initialSessions,
    onRedirected: showDone,
  })

  // Wrap passkey sign-in to track that user signed in via passkey
  const doPasskeySignIn = useCallback(
    (result: Parameters<typeof doPasskeySignInBase>[0]) => {
      setSignedInViaPasskey(true)
      doPasskeySignInBase(result)
    },
    [doPasskeySignInBase],
  )

  const homeView = !canSignUp || sessions.length ? View.SignIn : View.Welcome
  const showHome = useBoundDispatch(setView, homeView)
  const showSignUpIfAllowed = canSignUp ? showSignUp : undefined

  // Navigate when the user signs-in (selects a new session)
  const session = sessions.find((s) => s.selected && !s.loginRequired)
  useEffect(() => {
    if (session) {
      // Show passkey enrollment prompt if:
      // - passkeys are available
      // - user hasn't seen the prompt yet
      // - user signed in with password (not passkey - they already have one!)
      // - consent is required
      const shouldShowPasskeySetup =
        passkeyAvailable &&
        !passkeyEnrollmentShown &&
        !signedInViaPasskey &&
        session.consentRequired

      if (shouldShowPasskeySetup) {
        showPasskeySetup()
      } else if (session.consentRequired) {
        showConsent()
      } else {
        doConsent(session.account.sub)
      }
    }
  }, [
    session,
    doConsent,
    showConsent,
    showPasskeySetup,
    passkeyAvailable,
    passkeyEnrollmentShown,
    signedInViaPasskey,
  ])

  // Fool-proofing
  useEffect(() => {
    if (view === View.SignUp && !canSignUp) setView(homeView)
  }, [view, homeView, !canSignUp])
  useEffect(() => {
    if (view === View.Consent && !session) setView(homeView)
  }, [view, homeView, !session])
  useEffect(() => {
    if (view === View.PasskeySetup && !session) setView(homeView)
  }, [view, homeView, !session])
  useEffect(() => {
    if (view === View.Welcome && homeView !== View.Welcome) setView(homeView)
  }, [view, homeView])

  if (view === View.Welcome) {
    return (
      <WelcomeView
        {...props}
        customizationData={customizationData}
        onSignIn={showSignIn}
        onSignUp={showSignUpIfAllowed}
        onCancel={doReject}
      />
    )
  }

  if (view === View.SignUp) {
    return (
      <SignUpView
        {...props}
        customizationData={customizationData}
        onValidateNewHandle={doValidateNewHandle}
        onBack={showHome}
        onDone={doSignUp}
      />
    )
  }

  if (view === View.ResetPassword) {
    return (
      <ResetPasswordView
        {...props}
        emailDefault={resetPasswordHint}
        onresetPasswordRequest={doInitiatePasswordReset}
        onResetPasswordConfirm={doConfirmResetPassword}
        onBack={showHome}
      />
    )
  }

  if (view === View.SignIn) {
    return (
      <SignInView
        {...props}
        loginHint={authorizeData.loginHint}
        sessions={sessions}
        selectSub={selectSub}
        onSignIn={doSignIn}
        onPasskeySignIn={doPasskeySignIn}
        onSignUp={showSignUpIfAllowed}
        onBack={homeView === View.SignIn ? doReject : showHome}
        backLabel={homeView === View.SignIn ? t`Cancel` : undefined}
        onForgotPassword={(email) => {
          showResetPassword()
          setResetPasswordHint(email)
        }}
      />
    )
  }

  if (view === View.PasskeySetup) {
    // TypeSafety: should never be null here
    if (!session) return null

    return (
      <LayoutTitlePage
        {...props}
        title={t`Secure your account`}
        subtitle={
          <Trans>
            Add a passkey for faster and more secure sign-ins
          </Trans>
        }
      >
        <PasskeyRegisterPrompt
          sub={session.account.sub}
          defaultName={session.account.preferred_username || session.account.sub}
          bearer={session.ephemeralToken}
          onRegisterSuccess={() => {
            setPasskeyEnrollmentShown(true)
            showConsent()
          }}
          onSkip={() => {
            setPasskeyEnrollmentShown(true)
            showConsent()
          }}
        />
      </LayoutTitlePage>
    )
  }

  if (view === View.Consent) {
    // TypeSafety: should never be null here
    if (!session) return null

    return (
      <ConsentView
        {...props}
        clientId={authorizeData.clientId}
        clientMetadata={authorizeData.clientMetadata}
        clientTrusted={authorizeData.clientTrusted}
        clientFirstParty={authorizeData.clientFirstParty}
        permissionSets={authorizeData.permissionSets}
        account={session.account}
        scope={authorizeData.scope}
        onConsent={(scope) => doConsent(session.account.sub, scope)}
        onReject={doReject}
        onBack={
          forceSignIn
            ? undefined
            : () => {
                selectSub(null)
                showHome()
              }
        }
      />
    )
  }

  if (view === View.Done) {
    return (
      <LayoutTitlePage {...props} title={props.title ?? t`Login complete`}>
        <Trans>You are being redirected...</Trans>
      </LayoutTitlePage>
    )
  }

  // Fool-proofing
  throw new Error('Unexpected application state')
}
