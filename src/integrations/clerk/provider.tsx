import {
	ClerkProvider,
	useAuth as useClerkAuth,
	type UseAuthReturn,
} from "@clerk/clerk-react";
import { createContext, type ReactNode, useContext } from "react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// SSR-safe auth context - provides "not loaded" state during prerendering
const SSRAuthContext = createContext<UseAuthReturn | null>(null);

const SSR_AUTH_STATE: UseAuthReturn = {
	isLoaded: false,
	isSignedIn: undefined,
	userId: null,
	sessionId: null,
	orgId: null,
	orgRole: null,
	orgSlug: null,
	actor: null,
	signOut: async () => {},
	getToken: async () => null,
	has: () => false,
	sessionClaims: null,
	orgPermissions: null,
	factorVerificationAge: null,
};

/**
 * SSR-safe useAuth hook. Returns "not loaded" state during SSR/prerendering.
 */
export function useAuth(): UseAuthReturn {
	const ssrContext = useContext(SSRAuthContext);
	// If we're in SSR mode (context is set), return SSR defaults
	if (ssrContext !== null) {
		return ssrContext;
	}
	// Otherwise use real Clerk auth
	return useClerkAuth();
}

export default function AppClerkProvider({ children }: { children: ReactNode }) {
	// During SSR/prerendering, VITE_ env vars aren't available.
	// Provide mock auth context that returns "not loaded" state.
	if (!PUBLISHABLE_KEY) {
		return (
			<SSRAuthContext.Provider value={SSR_AUTH_STATE}>
				{children}
			</SSRAuthContext.Provider>
		);
	}

	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
			{children}
		</ClerkProvider>
	);
}
