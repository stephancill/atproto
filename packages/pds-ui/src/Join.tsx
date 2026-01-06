import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  AtSign,
} from 'lucide-react'
import { api, ApiError } from './api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default function Join() {
  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [validationError, setValidationError] = useState('')

  // Fetch server info
  const {
    data: serverInfo,
    isLoading: serverLoading,
    error: serverError,
  } = useQuery({
    queryKey: ['serverDescription'],
    queryFn: api.describeServer,
    retry: 1,
  })

  // Create account mutation
  const createAccount = useMutation({
    mutationFn: api.createAccount,
    onError: (err) => {
      console.error('Create account error:', err)
    },
  })

  const domain = serverInfo?.availableUserDomains?.[0] || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }

    const fullHandle = handle.includes('.') ? handle : `${handle}${domain}`

    createAccount.mutate({
      email,
      handle: fullHandle,
      password,
      inviteCode: inviteCode || undefined,
    })
  }

  const error =
    validationError ||
    (createAccount.error instanceof ApiError
      ? createAccount.error.message
      : createAccount.error?.message)

  if (serverLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Connecting to server...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (serverError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="text-destructive h-12 w-12" />
            <h2 className="text-lg font-semibold">Unable to Connect</h2>
            <p className="text-muted-foreground">
              Could not connect to the server. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (createAccount.isSuccess) {
    const displayHandle = handle.includes('.')
      ? handle
      : `${handle}${domain.replace(/^\./, '')}`

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center pb-6 pt-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Account Created!</h1>
            <p className="text-muted-foreground mb-6">
              Your account{' '}
              <span className="text-foreground font-medium">
                @{displayHandle}
              </span>{' '}
              has been created.
            </p>

            <div className="bg-muted/50 mb-6 w-full rounded-lg p-4">
              <h3 className="mb-3 text-sm font-medium">Next Steps</h3>
              <ol className="text-muted-foreground space-y-2 text-sm">
                <li className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    1
                  </span>
                  Download an AT Protocol app
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    2
                  </span>
                  Sign in with your new account
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    3
                  </span>
                  Start posting!
                </li>
              </ol>
            </div>

            <Button asChild className="w-full">
              <a
                href="https://bsky.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Bluesky
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="from-background via-background to-muted/30 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2 text-center">
          <div className="bg-primary/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full">
            <AtSign className="text-primary h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Sign up for this AT Protocol server</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {serverInfo?.inviteCodeRequired && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter your invite code"
                  autoComplete="off"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <div className="relative flex items-center">
                <span className="text-primary absolute left-3 font-medium">
                  @
                </span>
                <Input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) =>
                    setHandle(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    )
                  }
                  placeholder="yourname"
                  required
                  autoComplete="username"
                  className="pl-7 pr-[var(--suffix-width,0px)]"
                  style={
                    {
                      '--suffix-width':
                        domain && !handle.includes('.')
                          ? `${domain.length * 8 + 16}px`
                          : '0px',
                    } as React.CSSProperties
                  }
                />
                {domain && !handle.includes('.') && (
                  <span className="text-muted-foreground pointer-events-none absolute right-3 text-sm">
                    {domain}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createAccount.isPending}
            >
              {createAccount.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-muted-foreground text-center text-xs">
              By creating an account, you agree to this server's terms of
              service.
            </p>
          </form>
        </CardContent>

        <Separator />

        <CardFooter className="justify-center py-4">
          <p className="text-muted-foreground text-sm">
            Already have an account? Sign in with any AT Protocol app.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
