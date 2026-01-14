/**
 * Lightweight Convex HTTP client for server-side calls in Astro.
 * Supports optional authentication via Bearer token.
 */

interface PickedPark {
  _id: string;
  name: string;
  customName?: string;
  address?: string;
  photoUrl?: string;
  placeId: string;
}

interface ParkStats {
  _id: string;
  name: string;
  address?: string;
  visitCount?: number;
}

interface UserParkStats {
  _id: string;
  parkId: string;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  visitCount: number;
  lastVisitedAt?: number;
}

/**
 * Call a Convex action via HTTP with optional auth token.
 */
async function callAction<T>(
  deploymentUrl: string,
  actionPath: string,
  args: Record<string, unknown> = {},
  token?: string | null
): Promise<T> {
  const url = `${deploymentUrl}/api/action`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
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
 * Call a Convex query via HTTP with optional auth token.
 */
async function callQuery<T>(
  deploymentUrl: string,
  queryPath: string,
  args: Record<string, unknown> = {},
  token?: string | null
): Promise<T> {
  const url = `${deploymentUrl}/api/query`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      path: queryPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Convex query failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.status === "error") {
    throw new Error(result.errorMessage || "Unknown Convex error");
  }

  return result.value as T;
}

/**
 * Call a Convex mutation via HTTP with optional auth token.
 */
async function callMutation<T>(
  deploymentUrl: string,
  mutationPath: string,
  args: Record<string, unknown> = {},
  token?: string | null
): Promise<T> {
  const url = `${deploymentUrl}/api/mutation`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      path: mutationPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Convex mutation failed: ${response.status} - ${errorText}`);
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
export async function pickPark(token?: string | null): Promise<PickedPark> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  return callAction<PickedPark>(convexUrl, "actions/pickPark:pickPark", {}, token);
}

/**
 * Get the Convex deployment URL for client-side use.
 */
export function getConvexUrl(): string {
  return import.meta.env.CONVEX_URL || "";
}

/**
 * Get all parks sorted by visit count (legacy - global stats).
 */
export async function getParkStats(): Promise<ParkStats[]> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  return callQuery<ParkStats[]>(convexUrl, "parks:listByVisitCount", {});
}

/**
 * Get user's parks sorted by visit count (per-user stats).
 * Requires authentication token.
 */
export async function getUserParkStats(token: string): Promise<UserParkStats[]> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  return callQuery<UserParkStats[]>(convexUrl, "userParks:listUserParksByVisits", {}, token);
}

/**
 * Store/update user after authentication.
 */
export async function storeUser(token: string): Promise<string> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  return callMutation<string>(convexUrl, "users:store", {}, token);
}

export { callAction, callQuery, callMutation };
