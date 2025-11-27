"use node";

import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { getPhotoUrl } from "../lib/googleMaps";
import type { Id } from "../_generated/dataModel";

export interface PickedPark {
  id: string;
  name: string;
  address?: string;
  photoUrl?: string;
  placeId: string;
}

/**
 * Pick a random park that hasn't been chosen in the last 5 picks.
 * Returns the park with a photo URL.
 */
export const pickPark = action({
  args: {},
  handler: async (ctx): Promise<PickedPark> => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Ensure we have parks
    const parkCount = await ctx.runQuery(api.parks.count);
    if (parkCount === 0) {
      // Try to sync from Google if API key is available
      if (apiKey) {
        await ctx.runAction(api.actions.syncParks.syncParks, { force: true });
      } else {
        throw new Error(
          "No parks found. Run `npx convex run seed:seedParks` to add sample parks, " +
          "or set GOOGLE_MAPS_API_KEY to sync from Google Places."
        );
      }
    }

    // Get all parks
    const allParks = await ctx.runQuery(api.parks.list);
    if (allParks.length === 0) {
      throw new Error("No parks available. Please sync parks first.");
    }

    // Get the last 5 picked park IDs
    const lastFiveIds = await ctx.runQuery(internal.picks.getLastFivePickIds);
    const lastFiveSet = new Set(lastFiveIds.map((id) => id.toString()));

    // Filter out recently picked parks
    const eligibleParks = allParks.filter(
      (park) => !lastFiveSet.has(park._id.toString())
    );

    // If all parks have been picked recently (fewer parks than constraint),
    // allow picking from all parks
    const poolToPickFrom =
      eligibleParks.length > 0 ? eligibleParks : allParks;

    // Randomly select a park
    const randomIndex = Math.floor(Math.random() * poolToPickFrom.length);
    const selectedPark = poolToPickFrom[randomIndex];

    // Record this pick
    await ctx.runMutation(internal.picks.recordPick, {
      parkId: selectedPark._id,
    });

    // Generate photo URL if we have a photo reference
    let photoUrl: string | undefined;
    if (selectedPark.photoRefs.length > 0 && apiKey) {
      photoUrl = getPhotoUrl(selectedPark.photoRefs[0], apiKey, 1200);
    }

    return {
      id: selectedPark._id,
      name: selectedPark.name,
      address: selectedPark.address,
      photoUrl,
      placeId: selectedPark.placeId,
    };
  },
});

