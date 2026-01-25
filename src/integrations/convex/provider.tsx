import { useAuth } from "@clerk/clerk-react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

// Lazy-initialize client only when URL is available (not during SSR/prerender)
let convexClient: ConvexReactClient | null = null;
function getConvexClient(): ConvexReactClient | null {
	if (!CONVEX_URL) return null;
	if (!convexClient) {
		convexClient = new ConvexReactClient(CONVEX_URL);
	}
	return convexClient;
}

/**
 * Convex provider with Clerk authentication and TanStack Query integration.
 * Must be nested inside ClerkProvider for token exchange to work.
 */
export default function AppConvexProvider({ children }: { children: React.ReactNode }) {
	const client = getConvexClient();

	// During SSR/prerendering, env vars aren't available.
	// Render children without Convex wrapper - hydration will provide full functionality.
	if (!client) {
		return <>{children}</>;
	}

	return <ConvexProviderInner client={client}>{children}</ConvexProviderInner>;
}

function ConvexProviderInner({
	children,
	client,
}: { children: React.ReactNode; client: ConvexReactClient }) {
	// Create query clients once to avoid recreating on re-renders
	const [convexQueryClient] = useState(() => new ConvexQueryClient(client));
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// TanStack Query options for Convex integration
						queryKeyHashFn: convexQueryClient.hashFn(),
						queryFn: convexQueryClient.queryFn(),
					},
				},
			})
	);

	return (
		<ConvexProviderWithClerk client={client} useAuth={useAuth}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ConvexProviderWithClerk>
	);
}

// Export for use in other parts of the app - returns null during SSR
export { getConvexClient };
