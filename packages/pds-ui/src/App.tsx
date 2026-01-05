import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Copy,
	RefreshCw,
	Plus,
	LogOut,
	CheckCircle2,
	XCircle,
	Loader2,
	MailCheck,
	AlertTriangle,
	Send,
	Trash2,
} from "lucide-react";
import {
	api,
	basicAuth,
	ApiError,
	type InviteCode,
	type CreateAccountInput,
	type AccountView,
} from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

function App() {
	const queryClient = useQueryClient();
	const [adminPassword, setAdminPassword] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [activeTab, setActiveTab] = useState("invites");

	// Create account form
	const [newEmail, setNewEmail] = useState("");
	const [newHandle, setNewHandle] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newInviteCode, setNewInviteCode] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	// Confirmation modal state
	const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(
		null,
	);

	const auth = basicAuth(adminPassword);

	// Load saved auth
	useEffect(() => {
		const saved = localStorage.getItem("pds-admin-auth");
		if (saved) {
			setAdminPassword(saved);
			setIsAuthenticated(true);
		}
	}, []);

	// Fetch invite codes
	const inviteCodesQuery = useQuery({
		queryKey: ["inviteCodes", auth],
		queryFn: () => api.getInviteCodes(auth),
		enabled: isAuthenticated,
		retry: 1,
	});

	// Extract DIDs from invite code uses
	const inviteCodes = inviteCodesQuery.data?.codes || [];
	const accountDids = extractDidsFromInvites(inviteCodes);

	// Fetch detailed account info for all accounts
	const accountInfosQuery = useQuery({
		queryKey: ["accountInfos", auth, accountDids],
		queryFn: () =>
			accountDids.length > 0
				? api.getAccountInfos(auth, accountDids)
				: Promise.resolve({ infos: [] }),
		enabled: isAuthenticated && accountDids.length > 0,
		retry: 1,
	});

	// Create invite code mutation
	const createInviteMutation = useMutation({
		mutationFn: () => api.createInviteCode(auth),
		onSuccess: (data) => {
			setSuccessMessage(`Invite code created: ${data.code}`);
			queryClient.invalidateQueries({ queryKey: ["inviteCodes"] });
		},
	});

	// Create account mutation
	const createAccountMutation = useMutation({
		mutationFn: (input: CreateAccountInput) => api.createAccount(input),
		onSuccess: (data) => {
			setSuccessMessage(`Account created: ${data.handle}`);
			setNewEmail("");
			setNewHandle("");
			setNewPassword("");
			setNewInviteCode("");
			queryClient.invalidateQueries({ queryKey: ["inviteCodes"] });
		},
	});

	// Send email confirmation mutation
	const sendEmailConfirmationMutation = useMutation({
		mutationFn: (did: string) => api.sendEmailConfirmation(auth, did),
		onSuccess: () => {
			setSuccessMessage("Verification email sent!");
		},
	});

	// Disable invite code mutation
	const disableInviteMutation = useMutation({
		mutationFn: (code: string) => api.disableInviteCodes(auth, [code]),
		onSuccess: () => {
			setSuccessMessage("Invite code disabled");
			setConfirmDeleteCode(null);
			queryClient.invalidateQueries({ queryKey: ["inviteCodes"] });
		},
	});

	// Confirm account email mutation (manual verification)
	const confirmEmailMutation = useMutation({
		mutationFn: (did: string) => api.confirmAccountEmail(auth, did),
		onSuccess: () => {
			setSuccessMessage("Email verified!");
			queryClient.invalidateQueries({ queryKey: ["accountInfos"] });
		},
	});

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsAuthenticated(true);
		localStorage.setItem("pds-admin-auth", adminPassword);
	};

	const handleLogout = () => {
		setIsAuthenticated(false);
		setAdminPassword("");
		localStorage.removeItem("pds-admin-auth");
		queryClient.clear();
	};

	const handleCreateAccount = (e: React.FormEvent) => {
		e.preventDefault();
		setSuccessMessage("");

		createAccountMutation.mutate({
			email: newEmail,
			handle: newHandle,
			password: newPassword,
			inviteCode: newInviteCode || undefined,
		});
	};

	const accounts: AccountView[] = accountInfosQuery.data?.infos || [];

	const error =
		(inviteCodesQuery.error instanceof ApiError
			? inviteCodesQuery.error.message
			: inviteCodesQuery.error?.message) ||
		(accountInfosQuery.error instanceof ApiError
			? accountInfosQuery.error.message
			: accountInfosQuery.error?.message) ||
		(createInviteMutation.error instanceof ApiError
			? createInviteMutation.error.message
			: createInviteMutation.error?.message) ||
		(createAccountMutation.error instanceof ApiError
			? createAccountMutation.error.message
			: createAccountMutation.error?.message) ||
		(sendEmailConfirmationMutation.error instanceof ApiError
			? sendEmailConfirmationMutation.error.message
			: sendEmailConfirmationMutation.error?.message) ||
		(disableInviteMutation.error instanceof ApiError
			? disableInviteMutation.error.message
			: disableInviteMutation.error?.message) ||
		(confirmEmailMutation.error instanceof ApiError
			? confirmEmailMutation.error.message
			: confirmEmailMutation.error?.message);

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
				<Card className="w-full max-w-sm">
					<CardHeader className="text-center space-y-1">
						<CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
							PDS Admin
						</CardTitle>
						<CardDescription>
							Enter your admin password to continue
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleLogin} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="password">Admin Password</Label>
								<Input
									id="password"
									type="password"
									value={adminPassword}
									onChange={(e) => setAdminPassword(e.target.value)}
									placeholder="Enter admin password"
									autoFocus
								/>
							</div>
							<Button type="submit" className="w-full">
								Login
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-50 bg-card border-b">
				<div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
					<h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
						PDS Admin
					</h1>
					<Button variant="ghost" size="sm" onClick={handleLogout}>
						<LogOut className="h-4 w-4 mr-2" />
						Logout
					</Button>
				</div>
			</header>

			<main className="flex-1 max-w-5xl mx-auto w-full p-4">
				{error && (
					<Alert variant="destructive" className="mb-4">
						<XCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{successMessage && (
					<Alert className="mb-4 border-green-500/50 text-green-500 [&>svg]:text-green-500">
						<CheckCircle2 className="h-4 w-4" />
						<AlertDescription>{successMessage}</AlertDescription>
					</Alert>
				)}

				<Tabs
					value={activeTab}
					onValueChange={(v) => {
						setActiveTab(v);
						setSuccessMessage("");
					}}
				>
					<TabsList className="mb-4">
						<TabsTrigger value="invites">
							Invite Codes ({inviteCodes.length})
						</TabsTrigger>
						<TabsTrigger value="accounts">
							Accounts ({accounts.length})
						</TabsTrigger>
						<TabsTrigger value="create">Create Account</TabsTrigger>
					</TabsList>

					<TabsContent value="invites">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<CardTitle className="text-base font-medium">
									Invite Codes
								</CardTitle>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => inviteCodesQuery.refetch()}
										disabled={inviteCodesQuery.isFetching}
									>
										{inviteCodesQuery.isFetching ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<RefreshCw className="h-4 w-4" />
										)}
										<span className="ml-2 hidden sm:inline">Refresh</span>
									</Button>
									<Button
										size="sm"
										onClick={() => {
											setSuccessMessage("");
											createInviteMutation.mutate();
										}}
										disabled={createInviteMutation.isPending}
									>
										{createInviteMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
										<span className="ml-2">New Invite</span>
									</Button>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Code</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Uses</TableHead>
											<TableHead className="hidden sm:table-cell">
												Created
											</TableHead>
											<TableHead className="w-[50px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{inviteCodesQuery.isLoading ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="text-center py-8 text-muted-foreground"
												>
													<Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
													Loading...
												</TableCell>
											</TableRow>
										) : inviteCodes.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="text-center py-8 text-muted-foreground"
												>
													No invite codes yet
												</TableCell>
											</TableRow>
										) : (
											inviteCodes.map((code) => (
												<TableRow key={code.code}>
													<TableCell className="font-mono text-sm">
														<div className="flex items-center gap-2">
															<code className="bg-muted px-2 py-1 rounded text-xs">
																{code.code}
															</code>
															<Button
																variant="ghost"
																size="icon-sm"
																onClick={() => {
																	navigator.clipboard.writeText(code.code);
																	setSuccessMessage("Copied to clipboard!");
																	setTimeout(() => setSuccessMessage(""), 2000);
																}}
															>
																<Copy className="h-3.5 w-3.5" />
															</Button>
														</div>
													</TableCell>
													<TableCell>
														{code.disabled ? (
															<Badge variant="destructive">Disabled</Badge>
														) : code.available > 0 ? (
															<Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/25">
																Available
															</Badge>
														) : (
															<Badge variant="secondary">Used</Badge>
														)}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{code.uses?.length || 0} /{" "}
														{(code.uses?.length || 0) + code.available}
													</TableCell>
													<TableCell className="text-muted-foreground hidden sm:table-cell">
														{new Date(code.createdAt).toLocaleDateString()}
													</TableCell>
													<TableCell>
														{!code.disabled && (
															<Button
																variant="ghost"
																size="icon-sm"
																title="Disable invite code"
																onClick={() => {
																	setSuccessMessage("");
																	setConfirmDeleteCode(code.code);
																}}
															>
																<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
															</Button>
														)}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="accounts">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
								<div>
									<CardTitle className="text-base font-medium">
										Accounts
									</CardTitle>
									<CardDescription>
										Accounts created via invite codes
									</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										inviteCodesQuery.refetch();
										accountInfosQuery.refetch();
									}}
									disabled={
										inviteCodesQuery.isFetching || accountInfosQuery.isFetching
									}
								>
									{inviteCodesQuery.isFetching ||
									accountInfosQuery.isFetching ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="h-4 w-4" />
									)}
									<span className="ml-2 hidden sm:inline">Refresh</span>
								</Button>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Handle</TableHead>
											<TableHead className="hidden md:table-cell">
												Email
											</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="hidden sm:table-cell">
												Created
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{inviteCodesQuery.isLoading ||
										accountInfosQuery.isLoading ? (
											<TableRow>
												<TableCell
													colSpan={4}
													className="text-center py-8 text-muted-foreground"
												>
													<Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
													Loading...
												</TableCell>
											</TableRow>
										) : accounts.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={4}
													className="text-center py-8 text-muted-foreground"
												>
													No accounts found
												</TableCell>
											</TableRow>
										) : (
											accounts.map((account) => (
												<TableRow key={account.did}>
													<TableCell>
														<div className="flex flex-col gap-0.5">
															<span className="font-medium">
																@{account.handle}
															</span>
															<span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
																{account.did}
															</span>
														</div>
													</TableCell>
													<TableCell className="hidden md:table-cell">
														{account.email ? (
															<div className="flex items-center gap-2">
																<span className="text-sm truncate max-w-[180px]">
																	{account.email}
																</span>
																{account.emailConfirmedAt ? (
																	<span title="Email verified">
																		<MailCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
																	</span>
																) : (
																	<div className="flex items-center gap-1">
																		<Button
																			variant="ghost"
																			size="icon-sm"
																			title="Send verification email"
																			disabled={
																				sendEmailConfirmationMutation.isPending
																			}
																			onClick={() => {
																				setSuccessMessage("");
																				sendEmailConfirmationMutation.mutate(
																					account.did,
																				);
																			}}
																		>
																			{sendEmailConfirmationMutation.isPending ? (
																				<Loader2 className="h-4 w-4 animate-spin" />
																			) : (
																				<Send className="h-4 w-4 text-muted-foreground hover:text-primary" />
																			)}
																		</Button>
																		<Button
																			variant="ghost"
																			size="icon-sm"
																			title="Verify email manually"
																			disabled={confirmEmailMutation.isPending}
																			onClick={() => {
																				setSuccessMessage("");
																				confirmEmailMutation.mutate(
																					account.did,
																				);
																			}}
																		>
																			{confirmEmailMutation.isPending ? (
																				<Loader2 className="h-4 w-4 animate-spin" />
																			) : (
																				<CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-green-500" />
																			)}
																		</Button>
																	</div>
																)}
															</div>
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</TableCell>
													<TableCell>
														{account.deactivatedAt ? (
															<Badge variant="secondary" className="gap-1">
																<AlertTriangle className="h-3 w-3" />
																Deactivated
															</Badge>
														) : (
															<Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/25">
																Active
															</Badge>
														)}
													</TableCell>
													<TableCell className="text-muted-foreground hidden sm:table-cell">
														{new Date(account.indexedAt).toLocaleDateString()}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="create">
						<Card>
							<CardHeader>
								<CardTitle className="text-base font-medium">
									Create Account
								</CardTitle>
								<CardDescription>
									Create a new account on this PDS
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleCreateAccount} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="email">Email</Label>
										<Input
											id="email"
											type="email"
											value={newEmail}
											onChange={(e) => setNewEmail(e.target.value)}
											placeholder="user@example.com"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="handle">Handle</Label>
										<Input
											id="handle"
											type="text"
											value={newHandle}
											onChange={(e) => setNewHandle(e.target.value)}
											placeholder="username.pds.example.com"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="accountPassword">Password</Label>
										<Input
											id="accountPassword"
											type="password"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											placeholder="Account password"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="inviteCode">Invite Code (optional)</Label>
										<Input
											id="inviteCode"
											type="text"
											value={newInviteCode}
											onChange={(e) => setNewInviteCode(e.target.value)}
											placeholder="Leave empty if not required"
										/>
									</div>
									<Separator />
									<Button
										type="submit"
										className="w-full"
										disabled={createAccountMutation.isPending}
									>
										{createAccountMutation.isPending ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												Creating...
											</>
										) : (
											"Create Account"
										)}
									</Button>
								</form>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>

			{/* Confirmation Dialog for Disabling Invite Code */}
			<Dialog
				open={confirmDeleteCode !== null}
				onOpenChange={(open) => !open && setConfirmDeleteCode(null)}
			>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Disable Invite Code</DialogTitle>
						<DialogDescription>
							Are you sure you want to disable this invite code? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">
							{confirmDeleteCode}
						</code>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setConfirmDeleteCode(null)}
							disabled={disableInviteMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (confirmDeleteCode) {
									disableInviteMutation.mutate(confirmDeleteCode);
								}
							}}
							disabled={disableInviteMutation.isPending}
						>
							{disableInviteMutation.isPending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Disabling...
								</>
							) : (
								"Disable"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// Helper to extract unique DIDs from invite code uses
function extractDidsFromInvites(codes: InviteCode[]): string[] {
	const dids = new Set<string>();

	for (const code of codes) {
		for (const use of code.uses || []) {
			dids.add(use.usedBy);
		}
	}

	return Array.from(dids);
}

export default App;
