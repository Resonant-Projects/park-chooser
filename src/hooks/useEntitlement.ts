import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook combining Clerk's has() helper with Convex entitlement data.
 *
 * Clerk is the primary source for access checks (handles period end correctly),
 * while Convex provides additional details for UI display like "Premium ends on X date".
 */
export function useEntitlement() {
  const { has } = useAuth();
  const convexEntitlement = useQuery(api.entitlements.getMyEntitlement);

  // Clerk is primary source for access checks - handles canceled-but-still-active correctly
  const isPremium = has?.({ plan: "monthly" }) ?? false;

  return {
    // Access control (use this for feature gating)
    isPremium,

    // UI display details from Convex
    periodEnd: convexEntitlement?.periodEnd,
    periodStart: convexEntitlement?.periodStart,
    isFreeTrial: convexEntitlement?.isFreeTrial,
    status: convexEntitlement?.status,
    tier: convexEntitlement?.tier,
    effectiveTier: convexEntitlement?.effectiveTier,
    limits: convexEntitlement?.limits,

    // Loading state
    isLoading: convexEntitlement === undefined,
  };
}
