/**
 * Lightweight Convex HTTP client for server-side calls in Astro.
 */

interface PickedPark {
  id: string;
  name: string;
  address?: string;
  photoUrl?: string;
  placeId: string;
}

/**
 * Call a Convex action via HTTP.
 */
async function callAction<T>(
  deploymentUrl: string,
  actionPath: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const url = `${deploymentUrl}/api/action`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: actionPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Convex action failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.status === "error") {
    throw new Error(result.errorMessage || "Unknown Convex error");
  }

  return result.value as T;
}

/**
 * Pick a random park from the Convex backend.
 */
export async function pickPark(): Promise<PickedPark> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  return callAction<PickedPark>(convexUrl, "actions/pickPark:pickPark", {});
}

/**
 * Get the Convex deployment URL for client-side use.
 */
export function getConvexUrl(): string {
  return import.meta.env.CONVEX_URL || "";
}

