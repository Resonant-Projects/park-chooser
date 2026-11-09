import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";

// Vite inlines this at build time for both the client and SSR bundles.
// build/require-build-env.ts already aborts `vite build`/`vite dev` without it.
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Re-exported so app code has a single import site for auth state.
export { useAuth } from "@clerk/react";

export default function AppClerkProvider({ children }: { children: ReactNode }) {
	// Never render the app with sign-in silently disabled.
	if (!PUBLISHABLE_KEY) {
		throw new Error(
			"VITE_CLERK_PUBLISHABLE_KEY is not set. Refusing to render without Clerk authentication."
		);
	}

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
			{children}
		</ClerkProvider>
	);
}
