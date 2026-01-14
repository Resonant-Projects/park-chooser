/**
 * Entitlement tier limits and error codes for feature gating.
 *
 * Tiers:
 * - free: 5 parks max, 1 pick per day
 * - premium: Unlimited parks and picks
 */

export const TIER_LIMITS = {
  free: {
    maxParks: 5,
    picksPerDay: 1,
  },
  premium: {
    maxParks: Infinity,
    picksPerDay: Infinity,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

/**
 * Standardized error codes for UI handling.
 * UI can parse these from error messages to show appropriate prompts.
 */
export const ENTITLEMENT_ERRORS = {
  PARK_LIMIT_EXCEEDED: "PARK_LIMIT_EXCEEDED",
  DAILY_PICK_LIMIT_EXCEEDED: "DAILY_PICK_LIMIT_EXCEEDED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
} as const;

export type EntitlementError = keyof typeof ENTITLEMENT_ERRORS;

/**
 * Create a structured error that can be parsed by the UI.
 */
export function createLimitError(
  code: EntitlementError,
  message: string,
  details: {
    tier: Tier;
    limit: number;
    current?: number;
    resetsAt?: number;
  }
): Error {
  return new Error(
    JSON.stringify({
      code,
      message,
      ...details,
    })
  );
}

/**
 * Get the next midnight timestamp (UTC) for daily reset.
 */
export function getNextMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Get today's date in ISO format (YYYY-MM-DD) for daily tracking.
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
