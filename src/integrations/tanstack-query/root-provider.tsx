import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Singleton QueryClient to avoid cache isolation across calls
let cachedQueryClient: QueryClient | null = null

export function getContext() {
  if (!cachedQueryClient) {
    cachedQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60, // 1 minute
          retry: 1,
        },
      },
    })
  }
  return {
    queryClient: cachedQueryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
