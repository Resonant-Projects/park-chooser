import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { createContext, type ReactNode, useContext } from "react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
type AuthState = ReturnType<typeof useClerkAuth>;

// SSR-safe auth context - provides "not loaded" state during prerendering
const SSRAuthContext = createContext<AuthState | null>(null);

const SSR_AUTH_STATE: AuthState = {
	isLoaded: false,
	isSignedIn: undefined,
	userId: undefined,
	sessionId: undefined,
	orgId: undefined,
	orgRole: undefined,
	orgSlug: undefined,
	actor: undefined,
	signOut: async () => {},
	getToken: async () => null,
	has: undefined,
	sessionClaims: undefined,
};

/**
 * SSR-safe useAuth hook. Returns "not loaded" state during SSR/prerendering.
 */
export function useAuth(): AuthState {
	const ssrContext = useContext(SSRAuthContext);
	// If we're in SSR mode (context is set), return SSR defaults without touching
	// Clerk: newer @clerk/clerk-react throws when useAuth runs outside <ClerkProvider />.
	// The branch is stable for the module's lifetime (PUBLISHABLE_KEY is a build-time
	// constant), so hook order never changes between renders.
	if (ssrContext !== null) {
		return ssrContext;
	}
	// biome-ignore lint/correctness/useHookAtTopLevel: branch is constant per build (see above)
	return useClerkAuth();
}

export default function AppClerkProvider({ children }: { children: ReactNode }) {
	// During SSR/prerendering, VITE_ env vars aren't available.
	// Provide mock auth context that returns "not loaded" state.
	if (!PUBLISHABLE_KEY) {
		return <SSRAuthContext.Provider value={SSR_AUTH_STATE}>{children}</SSRAuthContext.Provider>;
	}

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
			{children}
		</ClerkProvider>
	);
}

/**
 * Renders Clerk UI components (SignIn, SignUp, ...) only when a real <ClerkProvider />
 * is mounted. Without a publishable key (SSR/prerender, or an environment missing
 * VITE_CLERK_PUBLISHABLE_KEY) Clerk components throw, so render nothing instead.
 */
export function ClerkOnly({ children }: { children: ReactNode }) {
	return useContext(SSRAuthContext) === null ? <>{children}</> : null;
}
