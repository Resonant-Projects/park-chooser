"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

type ProcessResult =
  | { processed: false; reason: string }
  | { processed: true; rewarded: false; reason: string }
  | { processed: true; rewarded: true; referrerId: Id<"users">; rewardType: string };

/**
 * Process referral conversion when a subscription becomes active.
 * Called from Clerk Billing webhook after subscription.created/updated.
 *
 * Flow:
 * 1. Look up pending referral for the subscriber
 * 2. Validate conversion (48hr delay, not fraudulent)
 * 3. Check referrer's reward limits
 * 4. Grant appropriate reward (bonus days or discount code)
 * 5. Update referral status
 */
export const processReferralConversion = internalAction({
  args: {
    refereeId: v.id("users"),
    subscriptionStatus: v.string(),
  },
  handler: async (ctx, args): Promise<ProcessResult> => {
    // Only process for active subscriptions (not trialing, incomplete, etc.)
    if (args.subscriptionStatus !== "active") {
      console.log(`Skipping referral conversion - subscription status: ${args.subscriptionStatus}`);
      return { processed: false, reason: "subscription_not_active" };
    }

    // Check for pending referral
    const pendingReferral = await ctx.runQuery(internal.referrals.getPendingReferralByReferee, {
      refereeId: args.refereeId,
    });

    if (!pendingReferral) {
      console.log("No pending referral for user:", args.refereeId);
      return { processed: false, reason: "no_pending_referral" };
    }

    console.log("Processing referral conversion:", pendingReferral._id);

    // Mark as converted (validates 48hr delay)
    const convertResult = await ctx.runMutation(internal.referrals.markReferralConverted, {
      referralId: pendingReferral._id,
    });

    if (!convertResult.success) {
      console.log("Conversion failed:", convertResult.reason);
      return { processed: false, reason: convertResult.reason ?? "conversion_failed" };
    }

    const referrerId = pendingReferral.referrerId;

    // Check referrer's reward limits
    const limitCheck = await ctx.runQuery(internal.referrals.checkRewardLimits, {
      userId: referrerId,
    });

    if (!limitCheck.canReceiveReward) {
      console.log("Referrer at reward limit:", limitCheck.reason);
      // Still mark as converted, but no reward granted
      return {
        processed: true,
        rewarded: false,
        reason: limitCheck.reason ?? "limit_reached",
      };
    }

    // Get referrer's current entitlement to determine reward type
    const referrerEntitlement = await ctx.runQuery(internal.entitlements.getEntitlementByUserId, {
      userId: referrerId,
    });

    const referrerTier: "free" | "premium" = referrerEntitlement?.tier ?? "free";

    // Wrap reward grant in try/catch to handle failures gracefully
    // The referral is already marked as "converted" - only mark "rewarded" on success
    try {
      if (referrerTier === "premium") {
        // Premium subscriber gets bonus days
        const rewardResult = await ctx.runMutation(internal.referralRewards.grantBonusDays, {
          userId: referrerId,
          referralId: pendingReferral._id,
        });
        console.log("Granted bonus days to referrer:", rewardResult);
      } else {
        // Free tier user gets discount code for future upgrade
        const rewardResult = await ctx.runMutation(internal.referralRewards.grantDiscountCode, {
          userId: referrerId,
          referralId: pendingReferral._id,
        });
        console.log("Granted discount code to referrer:", rewardResult);
      }

      // Mark referral as rewarded only after successful grant
      await ctx.runMutation(internal.referrals.markReferralRewarded, {
        referralId: pendingReferral._id,
      });

      return {
        processed: true,
        rewarded: true,
        referrerId,
        rewardType: referrerTier === "premium" ? "bonus_days" : "discount_code",
      };
    } catch (error) {
      console.error("Failed to grant referral reward:", error);
      return {
        processed: true,
        rewarded: false,
        reason: "reward_grant_failed",
      };
    }
  },
});
