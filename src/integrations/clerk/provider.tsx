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
	const clerkAuth = useClerkAuth();
	// If we're in SSR mode (context is set), return SSR defaults
	if (ssrContext !== null) {
		return ssrContext;
	}
	// Otherwise use real Clerk auth
	return clerkAuth;
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
