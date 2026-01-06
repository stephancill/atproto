import { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server'

export type Passkey = {
  credentialId: string
  deviceName: string
  createdAt: string
  lastUsedAt: string | null
  backupEligible: boolean
  backupState: boolean
}

export type PasskeyRegisterChallengeInput = {
  username: string
}

export type PasskeyRegisterChallengeOutput = {
  options: RegistrationResponseJSON
}

export type PasskeyRegisterVerifyInput = {
  username: string
  response: RegistrationResponseJSON
  deviceName?: string
}

export type PasskeyAuthenticateChallengeInput = {
  username: string
}

export type PasskeyAuthenticateChallengeOutput = {
  options: AuthenticationResponseJSON
}

export type PasskeyDeleteInput = {
  sub: string
  credentialId: string
}
