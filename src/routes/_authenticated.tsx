import { UserButton } from "@clerk/clerk-react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Trees } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../integrations/clerk/provider";

export const Route = createFileRoute("/_authenticated")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();
	const storeUser = useMutation(api.users.store);
	const [isBootstrappingUser, setIsBootstrappingUser] = useState(false);
	const [bootstrapError, setBootstrapError] = useState<string | null>(null);

	// Redirect unauthenticated users to sign-in
	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate({ to: "/sign-in" });
		}
	}, [isLoaded, isSignedIn, navigate]);

	// Ensure the authenticated Clerk user exists in Convex before app routes load.
	useEffect(() => {
		if (!isLoaded || !isSignedIn) {
			setIsBootstrappingUser(false);
			setBootstrapError(null);
			return;
		}

		let cancelled = false;
		setIsBootstrappingUser(true);
		setBootstrapError(null);

		storeUser({})
			.catch((error) => {
				if (!cancelled) {
					setBootstrapError(
						error instanceof Error
							? error.message
							: "Failed to initialize your account."
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsBootstrappingUser(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, storeUser]);

	// Show loading while checking auth
	if (!isLoaded || isBootstrappingUser) {
		return (
			<div className="container">
				<main>
					<div className="spinner" />
				</main>
			</div>
		);
	}

	// Don't render content if not signed in (will redirect)
	if (!isSignedIn) {
		return null;
	}

	if (bootstrapError) {
		return (
			<div className="container">
				<main className="flex flex-1 items-center justify-center">
					<div className="glass-card max-w-md w-full text-center py-6 px-4">
						<p className="text-[var(--color-cream)]">{bootstrapError}</p>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="container">
			<header className="flex items-center justify-between mb-6">
				<Link
					to="/app"
					className="flex items-center gap-2 text-[var(--color-cream)] hover:text-[var(--color-gold)] transition-colors"
				>
					<Trees className="w-8 h-8" />
					<span className="text-lg font-semibold hidden sm:inline">Pick A Park</span>
				</Link>

				<nav className="flex items-center gap-4">
					<Link
						to="/app"
						className="text-[var(--color-mist)] hover:text-[var(--color-cream)] transition-colors text-sm"
						activeProps={{ className: "text-[var(--color-gold)]" }}
					>
						Pick
					</Link>
					<Link
						to="/manage"
						className="text-[var(--color-mist)] hover:text-[var(--color-cream)] transition-colors text-sm"
						activeProps={{ className: "text-[var(--color-gold)]" }}
					>
						Manage
					</Link>
					<Link
						to="/discover"
						className="text-[var(--color-mist)] hover:text-[var(--color-cream)] transition-colors text-sm"
						activeProps={{ className: "text-[var(--color-gold)]" }}
					>
						Discover
					</Link>
					<Link
						to="/stats"
						className="text-[var(--color-mist)] hover:text-[var(--color-cream)] transition-colors text-sm"
						activeProps={{ className: "text-[var(--color-gold)]" }}
					>
						Stats
					</Link>
					<UserButton
						afterSignOutUrl="/"
						appearance={{
							elements: {
								avatarBox: "w-8 h-8",
							},
						}}
					/>
				</nav>
			</header>

			<Outlet />
		</div>
	);
}
