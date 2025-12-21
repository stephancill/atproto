// API client for PDS XRPC calls

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public error?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function xrpc<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST'
    body?: unknown
    auth?: string
  } = {},
): Promise<T> {
  const { method = 'GET', body, auth } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (auth) {
    headers['Authorization'] = auth
  }

  const response = await fetch(`/xrpc/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new ApiError(
      err.message || err.error || response.statusText,
      response.status,
      err.error,
    )
  }

  return response.json()
}

// Helper to create Basic auth header
export function basicAuth(password: string): string {
  return 'Basic ' + btoa('admin:' + password)
}

// Types
export interface ServerDescription {
  availableUserDomains: string[]
  inviteCodeRequired: boolean
  links?: {
    termsOfService?: string
    privacyPolicy?: string
  }
}

export interface InviteCode {
  code: string
  available: number
  disabled: boolean
  forAccount: string
  createdBy: string
  createdAt: string
  uses: { usedBy: string; usedAt: string }[]
}

export interface CreateAccountInput {
  email: string
  handle: string
  password: string
  inviteCode?: string
}

export interface CreateAccountOutput {
  did: string
  handle: string
  accessJwt: string
  refreshJwt: string
}

export interface AccountView {
  did: string
  handle: string
  email?: string
  indexedAt: string
  emailConfirmedAt?: string
  invitedBy?: InviteCode
  invites?: InviteCode[]
  invitesDisabled?: boolean
  deactivatedAt?: string
}

// API functions
export const api = {
  describeServer: () =>
    xrpc<ServerDescription>('com.atproto.server.describeServer'),

  createAccount: (input: CreateAccountInput) =>
    xrpc<CreateAccountOutput>('com.atproto.server.createAccount', {
      method: 'POST',
      body: input,
    }),

  createInviteCode: (auth: string, useCount = 1) =>
    xrpc<{ code: string }>('com.atproto.server.createInviteCode', {
      method: 'POST',
      body: { useCount },
      auth,
    }),

  getInviteCodes: (auth: string) =>
    xrpc<{ codes: InviteCode[] }>('com.atproto.admin.getInviteCodes', {
      auth,
    }),

  getAccountInfos: (auth: string, dids: string[]) =>
    xrpc<{ infos: AccountView[] }>(
      `com.atproto.admin.getAccountInfos?${dids.map(d => `dids=${encodeURIComponent(d)}`).join('&')}`,
      { auth },
    ),

  sendEmailConfirmation: (auth: string, did: string) =>
    xrpc<{ sent: boolean }>('com.atproto.admin.sendEmailConfirmation', {
      method: 'POST',
      body: { did },
      auth,
    }),
}

