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
 * User entitlements (tier, limits, usage).
 */
export interface UserEntitlements {
  tier: "free" | "premium";
  status: "active" | "past_due" | "canceled" | "incomplete";
  limits: {
    maxParks: number; // -1 means unlimited
    picksPerDay: number; // -1 means unlimited
  };
  usage: {
    currentParks: number;
    picksToday: number;
  };
  canAddPark: boolean;
  canPick: boolean;
  periodEnd?: number;
}

/**
 * Structured error from entitlement limit checks.
 */
export interface LimitError {
  code: string;
  message: string;
  tier: "free" | "premium";
  limit: number;
  current?: number;
  resetsAt?: number;
}

/**
 * Error codes for entitlement limits.
 */
export const ENTITLEMENT_ERROR_CODES = {
  PARK_LIMIT_EXCEEDED: "PARK_LIMIT_EXCEEDED",
  DAILY_PICK_LIMIT_EXCEEDED: "DAILY_PICK_LIMIT_EXCEEDED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
} as const;

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

/**
 * Get user's parks (for manage page).
 */
export async function getUserParks(token: string) {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery(convexUrl, "userParks:listUserParks", {}, token);
}

/**
 * Get parks available to add (not in user's list).
 */
export async function getAvailableParks(token: string) {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery(convexUrl, "parks:getAvailableParks", {}, token);
}

/**
 * Get user's entitlements (tier, limits, usage).
 * Returns null if not authenticated.
 */
export async function getUserEntitlements(
  token: string
): Promise<UserEntitlements | null> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<UserEntitlements | null>(
    convexUrl,
    "entitlements:getUserEntitlements",
    {},
    token
  );
}

/**
 * Parse a limit error from an error message.
 * Returns null if the error is not a limit error.
 */
export function parseLimitError(error: unknown): LimitError | null {
  if (!(error instanceof Error)) return null;

  try {
    // Try to parse the error message as JSON
    const parsed = JSON.parse(error.message);
    if (
      parsed.code &&
      Object.values(ENTITLEMENT_ERROR_CODES).includes(parsed.code)
    ) {
      return parsed as LimitError;
    }
  } catch {
    // Not a JSON error, check if the message contains a limit error code
    const message = error.message;
    for (const code of Object.values(ENTITLEMENT_ERROR_CODES)) {
      if (message.includes(code)) {
        return {
          code,
          message,
          tier: "free",
          limit: -1,
        };
      }
    }
  }

  return null;
}

/**
 * Check if an error is a limit error.
 */
export function isLimitError(error: unknown): boolean {
  return parseLimitError(error) !== null;
}

/**
 * Format reset time for display.
 */
export function formatResetTime(resetsAt: number): string {
  const now = Date.now();
  const diff = resetsAt - now;

  if (diff <= 0) return "now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export { callAction, callQuery, callMutation };
