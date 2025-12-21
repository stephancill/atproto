import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
	Loader2,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	AtSign,
} from "lucide-react";
import { api, ApiError } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function Join() {
	const [email, setEmail] = useState("");
	const [handle, setHandle] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [validationError, setValidationError] = useState("");

	// Fetch server info
	const {
		data: serverInfo,
		isLoading: serverLoading,
		error: serverError,
	} = useQuery({
		queryKey: ["serverDescription"],
		queryFn: api.describeServer,
		retry: 1,
	});

	// Create account mutation
	const createAccount = useMutation({
		mutationFn: api.createAccount,
		onError: (err) => {
			console.error("Create account error:", err);
		},
	});

	const domain = serverInfo?.availableUserDomains?.[0] || "";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError("");

		if (password !== confirmPassword) {
			setValidationError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setValidationError("Password must be at least 8 characters");
			return;
		}

		const fullHandle = handle.includes(".") ? handle : `${handle}${domain}`;

		createAccount.mutate({
			email,
			handle: fullHandle,
			password,
			inviteCode: inviteCode || undefined,
		});
	};

	const error =
		validationError ||
		(createAccount.error instanceof ApiError
			? createAccount.error.message
			: createAccount.error?.message);

	if (serverLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="py-12 flex flex-col items-center gap-3">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						<p className="text-muted-foreground">Connecting to server...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (serverError) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="py-12 flex flex-col items-center gap-3 text-center">
						<AlertCircle className="h-12 w-12 text-destructive" />
						<h2 className="text-lg font-semibold">Unable to Connect</h2>
						<p className="text-muted-foreground">
							Could not connect to the server. Please try again later.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (createAccount.isSuccess) {
		const displayHandle = handle.includes(".")
			? handle
			: `${handle}${domain.replace(/^\./, "")}`;

		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
						<div className="h-16 w-16 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
							<CheckCircle2 className="h-8 w-8 text-green-500" />
						</div>
						<h1 className="text-2xl font-bold mb-2">Account Created!</h1>
						<p className="text-muted-foreground mb-6">
							Your account{" "}
							<span className="font-medium text-foreground">
								@{displayHandle}
							</span>{" "}
							has been created.
						</p>

						<div className="w-full bg-muted/50 rounded-lg p-4 mb-6">
							<h3 className="font-medium text-sm mb-3">Next Steps</h3>
							<ol className="space-y-2 text-sm text-muted-foreground">
								<li className="flex items-center gap-3">
									<span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-medium flex items-center justify-center shrink-0">
										1
									</span>
									Download an AT Protocol app
								</li>
								<li className="flex items-center gap-3">
									<span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-medium flex items-center justify-center shrink-0">
										2
									</span>
									Sign in with your new account
								</li>
								<li className="flex items-center gap-3">
									<span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-medium flex items-center justify-center shrink-0">
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
								<ExternalLink className="h-4 w-4 ml-2" />
							</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center pb-2">
					<div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
						<AtSign className="h-7 w-7 text-primary" />
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
								<span className="absolute left-3 text-primary font-medium">
									@
								</span>
								<Input
									id="handle"
									type="text"
									value={handle}
									onChange={(e) =>
										setHandle(
											e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
										)
									}
									placeholder="yourname"
									required
									autoComplete="username"
									className="pl-7 pr-[var(--suffix-width,0px)]"
									style={
										{
											"--suffix-width":
												domain && !handle.includes(".")
													? `${domain.length * 8 + 16}px`
													: "0px",
										} as React.CSSProperties
									}
								/>
								{domain && !handle.includes(".") && (
									<span className="absolute right-3 text-muted-foreground text-sm pointer-events-none">
										{domain}
									</span>
								)}
							</div>
							<p className="text-xs text-muted-foreground">
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
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Creating Account...
								</>
							) : (
								"Create Account"
							)}
						</Button>

						<p className="text-center text-xs text-muted-foreground">
							By creating an account, you agree to this server's terms of
							service.
						</p>
					</form>
				</CardContent>

				<Separator />

				<CardFooter className="justify-center py-4">
					<p className="text-sm text-muted-foreground">
						Already have an account? Sign in with any AT Protocol app.
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
