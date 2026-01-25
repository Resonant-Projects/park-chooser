import { UserButton, useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Trees } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();

	// Redirect unauthenticated users to sign-in
	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate({ to: "/sign-in" });
		}
	}, [isLoaded, isSignedIn, navigate]);

	// Show loading while checking auth
	if (!isLoaded) {
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
