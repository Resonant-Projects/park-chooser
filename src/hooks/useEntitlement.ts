import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../integrations/clerk/provider";

/**
 * Hook combining Clerk's plan helper with Convex billing state.
 *
 * Billing state is descriptive only. Do not use this hook to gate features.
 */
export function useEntitlement() {
	const { has, isLoaded: isAuthLoaded } = useAuth();
	const convexEntitlement = useQuery(api.entitlements.getMyEntitlement);

	// Clerk is the primary source for current supporter status.
	const isSupporter = has?.({ plan: "monthly" }) ?? false;

	return {
		// Billing/supporter state
		isSupporter,

		// Supporting details from Convex for account messaging
		periodEnd: convexEntitlement?.periodEnd,
		periodStart: convexEntitlement?.periodStart,
		isFreeTrial: convexEntitlement?.isFreeTrial,
		status: convexEntitlement?.status,
		tier: convexEntitlement?.tier,
		effectiveTier: convexEntitlement?.effectiveTier,
		limits: convexEntitlement?.limits,

		// Loading states
		isAuthLoaded,
		isLoading: !isAuthLoaded || convexEntitlement === undefined,
	};
}
