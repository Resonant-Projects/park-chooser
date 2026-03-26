/**
 * Entitlement tier labels and legacy limit/error helpers.
 *
 * Billing state is still stored for optional supporter subscriptions, but access is no
 * longer gated by payment. Both tiers therefore resolve to the same unlimited limits.
 */

// Use Number.MAX_SAFE_INTEGER instead of Infinity for JSON serialization compatibility
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const TIER_LIMITS = {
	free: {
		maxParks: UNLIMITED,
		picksPerDay: UNLIMITED,
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
 * Calculate effective tier based on supporter subscription status and period end date.
 *
 * This is descriptive billing state for UI/account messaging only. Access is not gated
 * by the returned tier.
 *
 * @param entitlement - The user's entitlement record
 * @returns The effective tier label ("free" or "premium")
 */
export function getEffectiveTier(entitlement: {
	tier: "free" | "premium";
	status: string;
	periodEnd?: number;
	isFreeTrial?: boolean;
}): Tier {
	const now = Date.now();

	// Active supporter subscription (paid or trial)
	if (entitlement.tier === "premium" && entitlement.status === "active") {
		return "premium";
	}

	// Canceled but within the current billing period
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
