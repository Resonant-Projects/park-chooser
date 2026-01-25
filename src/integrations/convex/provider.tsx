import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { useAuth } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL as string | undefined

if (!CONVEX_URL) {
  throw new Error('Missing required environment variable VITE_CONVEX_URL')
}

const convexClient = new ConvexReactClient(CONVEX_URL)

/**
 * Convex provider with Clerk authentication and TanStack Query integration.
 * Must be nested inside ClerkProvider for token exchange to work.
 */
export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Create query clients once to avoid recreating on re-renders
  const [convexQueryClient] = useState(() => new ConvexQueryClient(convexClient))
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
  )

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConvexProviderWithClerk>
  )
}

// Export for use in other parts of the app
export { convexClient }
