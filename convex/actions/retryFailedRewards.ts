"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

type RetrySummary = {
	retried: number;
	succeeded: number;
	failed: number;
	escalated: number;
};

/**
 * Internal: Retry failed referral reward grants.
 * Called periodically by a scheduled cron job.
 *
 * Flow:
 * 1. Query all pending failed rewards
 * 2. For each failed reward, attempt to grant again
 * 3. On success: mark referral as rewarded and mark failure as resolved
 * 4. On failure: increment retry count and escalate after max attempts
 */
export const retryFailedRewards = internalAction({
	args: {},
	handler: async (ctx): Promise<RetrySummary> => {
		// Get all pending failed rewards
		const failedRewards = await ctx.runQuery(
			internal.failedReferralRewards.getFailedRewardsForRetry
		);

		if (failedRewards.length === 0) {
			console.log("No failed rewards to retry");
			return { retried: 0, succeeded: 0, failed: 0, escalated: 0 };
		}

		console.log(`Retrying ${failedRewards.length} failed reward grants`);

		let succeeded = 0;
		let failed = 0;
		let escalated = 0;

		for (const failedReward of failedRewards) {
			try {
				// Attempt to grant the reward again
				if (failedReward.rewardType === "bonus_days") {
					await ctx.runMutation(internal.referralRewards.grantBonusDays, {
						userId: failedReward.userId,
						referralId: failedReward.referralId,
					});
				} else {
					await ctx.runMutation(internal.referralRewards.grantDiscountCode, {
						userId: failedReward.userId,
						referralId: failedReward.referralId,
					});
				}

				// Mark referral as rewarded
				await ctx.runMutation(internal.referrals.markReferralRewarded, {
					referralId: failedReward.referralId,
				});

				// Mark failure as resolved
				await ctx.runMutation(internal.failedReferralRewards.markResolved, {
					failedRewardId: failedReward._id,
				});

				succeeded++;
				console.log(`Successfully retried reward for referral ${failedReward.referralId}`);
			} catch (error) {
				console.error(`Retry failed for referral ${failedReward.referralId}:`, error);

				// Increment retry count (will escalate after max attempts)
				const result = await ctx.runMutation(
					internal.failedReferralRewards.incrementRetryCount,
					{
						failedRewardId: failedReward._id,
					}
				);

				if (result.status === "escalated") {
					escalated++;
					console.error(
						`Referral ${failedReward.referralId} escalated after ${result.retryCount} failed retries`
					);
				} else {
					failed++;
				}
			}
		}

		const summary: RetrySummary = {
			retried: failedRewards.length,
			succeeded,
			failed,
			escalated,
		};

		console.log("Retry summary:", summary);
		return summary;
	},
});
