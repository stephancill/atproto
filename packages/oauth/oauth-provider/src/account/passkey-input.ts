import { z } from 'zod'
import { handleSchema } from '../types/handle.js'
import { subSchema } from '../oidc/sub.js'
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server'

export const passkeyRegisterChallengeInputSchema = z.object({
  username: handleSchema,
})

export const passkeyRegisterVerifyInputSchema = z.object({
  username: handleSchema,
  response: z.unknown() as z.ZodType<RegistrationResponseJSON>,
  deviceName: z.string().optional(),
})

export const passkeyAuthenticateChallengeInputSchema = z.object({
  username: handleSchema,
})

export const passkeyAuthenticateVerifyInputSchema = z.object({
  username: handleSchema,
  response: z.unknown() as z.ZodType<AuthenticationResponseJSON>,
  remember: z.boolean().optional(),
})

export const passkeyDeleteInputSchema = z.object({
  sub: subSchema,
  credentialId: z.string(),
})
