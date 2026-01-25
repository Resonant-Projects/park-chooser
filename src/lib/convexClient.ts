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
 * User's park list item (from listUserParks query).
 */
export interface UserPark {
  _id: string;
  parkId: string;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  photoRefs: string[];
  visitCount: number;
  lastVisitedAt?: number;
  notes?: string;
  addedAt: number;
}

/**
 * Available park (from getAvailableParks query).
 */
export interface AvailablePark {
  _id: string;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  photoRefs: string[];
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
  activeBonusDaysUntil?: number | null; // Timestamp when bonus days expire
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
 * Optionally pass a referral code for new user signups.
 */
export async function storeUser(token: string, referralCode?: string): Promise<string> {
  const convexUrl = import.meta.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  const args: Record<string, unknown> = {};
  if (referralCode) {
    args.referralCode = referralCode;
  }

  return callMutation<string>(convexUrl, "users:store", args, token);
}

/**
 * Get user's parks (for manage page).
 */
export async function getUserParks(token: string): Promise<UserPark[]> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<UserPark[]>(convexUrl, "userParks:listUserParks", {}, token);
}

/**
 * Get parks available to add (not in user's list).
 */
export async function getAvailableParks(token: string): Promise<AvailablePark[]> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<AvailablePark[]>(convexUrl, "parks:getAvailableParks", {}, token);
}

/**
 * Get user's entitlements (tier, limits, usage).
 * Returns null if not authenticated.
 */
export async function getUserEntitlements(token: string): Promise<UserEntitlements | null> {
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
 * Uses multiple regex patterns for robust parsing with sensible defaults.
 */
export function parseLimitError(error: unknown): LimitError | null {
  if (!(error instanceof Error)) return null;

  // Optional debug logging (enable via window.__LIMIT_ERROR_DEBUG__ = true in browser console)
  const debugEnabled =
    typeof window !== "undefined" &&
    (window as unknown as { __LIMIT_ERROR_DEBUG__?: boolean }).__LIMIT_ERROR_DEBUG__;
  const debug = (msg: string, data?: unknown) => {
    if (debugEnabled) console.log(`[parseLimitError] ${msg}`, data ?? "");
  };

  debug("Parsing error:", error.message);

  try {
    // Try to parse the error message as JSON
    const parsed = JSON.parse(error.message);
    if (parsed.code && Object.values(ENTITLEMENT_ERROR_CODES).includes(parsed.code)) {
      debug("Parsed as JSON:", parsed);
      return parsed as LimitError;
    }
  } catch {
    // Not a JSON error, check if the message contains a limit error code
    const message = error.message;
    for (const code of Object.values(ENTITLEMENT_ERROR_CODES)) {
      if (message.includes(code)) {
        debug("Found error code:", code);

        // Multiple patterns for tier extraction (case-insensitive)
        const tierPatterns = [
          /tier[:\s]+"?(free|premium)"?/i,
          /"tier"\s*:\s*"(free|premium)"/i,
          /\((free|premium)\s+tier\)/i,
          /\b(free|premium)\s+(?:users?|accounts?|tier)/i,
        ];

        let tier: "free" | "premium" = "free";
        for (const pattern of tierPatterns) {
          const match = message.match(pattern);
          if (match) {
            tier = match[1].toLowerCase() as "free" | "premium";
            debug("Extracted tier:", tier);
            break;
          }
        }

        // Multiple patterns for limit extraction
        const limitPatterns = [
          /limit[:\s]+(\d+)/i,
          /(\d+)\/(\d+)/, // X/Y format (uses Y as limit)
          /max(?:imum)?[:\s]+(\d+)/i,
          /\((\d+)\s*parks?\)/i,
          /"limit"\s*:\s*(\d+)/i,
        ];

        let limit = 0;
        for (const pattern of limitPatterns) {
          const match = message.match(pattern);
          if (match) {
            // For X/Y format, use Y (the limit)
            limit = parseInt(match[pattern.source.includes("/") ? 2 : 1], 10);
            debug("Extracted limit:", limit);
            break;
          }
        }

        // Sensible defaults based on error code + tier if parsing failed
        if (limit === 0) {
          if (code === ENTITLEMENT_ERROR_CODES.PARK_LIMIT_EXCEEDED) {
            limit = tier === "free" ? 5 : 1000; // Default free tier park limit
          } else if (code === ENTITLEMENT_ERROR_CODES.DAILY_PICK_LIMIT_EXCEEDED) {
            limit = tier === "free" ? 3 : 1000; // Default free tier daily pick limit
          }
          debug("Using default limit:", limit);
        }

        return {
          code,
          message,
          tier,
          limit,
        };
      }
    }
  }

  debug("Not a limit error");
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

/**
 * Validate a referral code (no auth required).
 */
export interface ReferralValidation {
  valid: boolean;
  reason?: string;
  referrerName?: string;
}

export async function validateReferralCode(code: string): Promise<ReferralValidation> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<ReferralValidation>(convexUrl, "referralCodes:validateCode", { code });
}

/**
 * User's referral code info.
 */
export interface MyReferralCode {
  code: string;
  totalReferrals: number;
  createdAt: number;
}

/**
 * Get current user's referral code.
 */
export async function getMyReferralCode(token: string): Promise<MyReferralCode | null> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<MyReferralCode | null>(convexUrl, "referralCodes:getMyCode", {}, token);
}

/**
 * Get or create user's referral code.
 */
export async function getOrCreateMyReferralCode(token: string): Promise<MyReferralCode> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callMutation<MyReferralCode>(convexUrl, "referralCodes:getOrCreateMyCode", {}, token);
}

/**
 * User's referral stats.
 */
export interface MyReferralStats {
  totalReferrals: number;
  pending: number;
  converted: number;
  rewarded: number;
  totalRewardsEarned: number;
  activeBonusDaysUntil: number | null;
}

/**
 * Get current user's referral stats.
 */
export async function getMyReferralStats(token: string): Promise<MyReferralStats | null> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<MyReferralStats | null>(
    convexUrl,
    "referralCodes:getMyReferralStats",
    {},
    token
  );
}

/**
 * Generate a Google Places photo URL from a photo reference.
 * For use in SSR contexts where we have access to the API key.
 */
export function getPhotoUrlFromRef(photoRef: string, apiKey: string, maxWidth = 400): string {
  return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

export { callAction, callQuery, callMutation };
