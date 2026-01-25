"use node";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { createLimitError, ENTITLEMENT_ERRORS, getNextMidnightUTC } from "../lib/entitlements";
import { loadFreshPhotos } from "../lib/googleMaps";

export interface PickedPark {
	_id: string;
	name: string;
	customName?: string;
	address?: string;
	photoUrl?: string;
	photoUrls?: string[]; // All available photos for carousel
	placeId: string;
}

interface UserParkWithDetails {
	_id: Id<"userParks">;
	parkId: Id<"parks">;
	placeId: string;
	name: string;
	customName: string | undefined;
	address: string | undefined;
	photoRefs: string[];
}

/**
 * Pick a random park from the user's list that hasn't been chosen
 * in the last 5 picks (per-user constraint).
 */
export const pickPark = action({
	args: {},
	handler: async (ctx): Promise<PickedPark> => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;

		// Get current user (required for per-user lists)
		const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
		if (!user) {
			throw new Error("Authentication required to pick a park");
		}

		// Check daily pick limit
		const pickCheck = await ctx.runQuery(internal.entitlements.checkCanPickToday, {
			userId: user._id,
		});

		if (!pickCheck.canPick) {
			throw createLimitError(
				ENTITLEMENT_ERRORS.DAILY_PICK_LIMIT_EXCEEDED,
				`Daily pick limit reached (${pickCheck.currentCount}/${pickCheck.limit}). Upgrade to Premium for unlimited picks.`,
				{
					tier: pickCheck.tier,
					limit: pickCheck.limit,
					current: pickCheck.currentCount,
					resetsAt: getNextMidnightUTC(),
				}
			);
		}

		// Get all parks in user's list (cast and filter nulls)
		const rawUserParks = await ctx.runQuery(internal.userParks.getUserParksWithDetails, {
			userId: user._id,
		});
		const userParks: UserParkWithDetails[] = rawUserParks.filter(
			(p: UserParkWithDetails | null): p is UserParkWithDetails => p !== null
		);

		if (userParks.length === 0) {
			throw new Error(
				"NO_PARKS: Add parks to your list first. Visit the Manage page to get started."
			);
		}

		// Get the last 5 picked park IDs for this user
		const lastFiveIds = await ctx.runQuery(internal.userParks.getLastFivePickIdsForUser, {
			userId: user._id,
		});
		const lastFiveSet = new Set(lastFiveIds.map((id: Id<"parks">) => id.toString()));

		// Filter out recently picked parks
		const eligibleParks: UserParkWithDetails[] = userParks.filter(
			(up: UserParkWithDetails) => !lastFiveSet.has(up.parkId.toString())
		);

		// If all parks have been picked recently, allow picking from all
		const poolToPickFrom: UserParkWithDetails[] =
			eligibleParks.length > 0 ? eligibleParks : userParks;

		// Randomly select a park
		const randomIndex = Math.floor(Math.random() * poolToPickFrom.length);
		const selectedPark: UserParkWithDetails = poolToPickFrom[randomIndex];

		// Validate that the park still exists before recording
		const parkExists = await ctx.runQuery(internal.parks.getById, {
			id: selectedPark.parkId,
		});
		if (!parkExists) {
			throw new Error(
				"PARK_NOT_FOUND: The selected park no longer exists. Please refresh and try again."
			);
		}

		// Record this pick
		await ctx.runMutation(internal.picks.recordPick, {
			parkId: selectedPark.parkId,
			userId: user._id,
			userParkId: selectedPark._id,
		});

		// Increment daily pick count for rate limiting
		await ctx.runMutation(internal.entitlements.incrementDailyPickCount, {
			userId: user._id,
		});

		// Generate photo URLs - ALWAYS fetch fresh refs because Google photo names expire
		const photos = await loadFreshPhotos(
			selectedPark.placeId,
			selectedPark.name,
			apiKey,
			"pickPark"
		);

		return {
			_id: selectedPark.parkId.toString(),
			name: selectedPark.name,
			customName: selectedPark.customName,
			address: selectedPark.address,
			photoUrl: photos.photoUrl,
			photoUrls: photos.photoUrls.length > 0 ? photos.photoUrls : undefined,
			placeId: selectedPark.placeId,
		};
	},
});
