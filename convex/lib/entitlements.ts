/**
 * Entitlement tier limits and error codes for feature gating.
 *
 * Tiers:
 * - free: 5 parks max, 1 pick per day
 * - premium: Unlimited parks and picks
 */

// Use Number.MAX_SAFE_INTEGER instead of Infinity for JSON serialization compatibility
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const TIER_LIMITS = {
  free: {
    maxParks: 5,
    picksPerDay: 1,
  },
  premium: {
    maxParks: UNLIMITED,
    picksPerDay: UNLIMITED,
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

/**
 * Calculate effective tier based on subscription status and period end date.
 *
 * This function handles the case where a user cancels their subscription but
 * should maintain premium access until the end of their paid period.
 *
 * @param entitlement - The user's entitlement record
 * @returns The effective tier ("free" or "premium")
 */
export function getEffectiveTier(entitlement: {
  tier: "free" | "premium";
  status: string;
  periodEnd?: number;
  isFreeTrial?: boolean;
}): Tier {
  const now = Date.now();

  // Active premium subscription (paid or trial)
  if (entitlement.tier === "premium" && entitlement.status === "active") {
    return "premium";
  }

  // Canceled but within paid period - honor what they paid for
  // This applies to both canceled trials and canceled paid subscriptions
  if (
    entitlement.tier === "premium" &&
    entitlement.status === "canceled" &&
    entitlement.periodEnd &&
    now < entitlement.periodEnd
  ) {
    return "premium";
  }

  return "free";
}
