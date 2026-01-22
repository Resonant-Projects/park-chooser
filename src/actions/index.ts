/**
 * Astro Actions for Park-Chooser
 *
 * Centralizes server-side logic and removes token management from client code.
 * Auth is handled via context.locals from Clerk middleware.
 *
 * Note: trackVisit remains as direct Convex call (requires keepalive for fire-and-forget)
 */

import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import {
  callAction,
  callMutation,
  callQuery,
  getPhotoUrlFromRef,
  type UserEntitlements,
} from "../lib/convexClient";

// Get Convex URL from environment
function getConvexUrl(): string {
  const url = import.meta.env.CONVEX_URL;
  if (!url) {
    throw new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: "CONVEX_URL environment variable is not set",
    });
  }
  return url;
}

// Helper to get Convex token from Astro context
async function getConvexToken(context: {
  locals: { auth: () => { getToken: (opts: { template: string }) => Promise<string | null> } };
}): Promise<string> {
  const { getToken } = context.locals.auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return token;
}

// Helper to map Convex errors to ActionError codes
function mapConvexError(error: unknown): ActionError {
  if (error instanceof ActionError) return error;

  const message = error instanceof Error ? error.message : String(error);

  // Map specific error codes
  if (message.includes("DAILY_PICK_LIMIT_EXCEEDED") || message.includes("Daily pick limit")) {
    return new ActionError({
      code: "FORBIDDEN",
      message: "DAILY_PICK_LIMIT_EXCEEDED: " + message,
    });
  }
  if (message.includes("PARK_LIMIT_EXCEEDED") || message.includes("park limit")) {
    return new ActionError({
      code: "FORBIDDEN",
      message: "PARK_LIMIT_EXCEEDED: " + message,
    });
  }
  if (message.includes("NO_PARKS") || message.includes("No parks")) {
    return new ActionError({
      code: "NOT_FOUND",
      message: "NO_PARKS: " + message,
    });
  }
  if (message.includes("Unauthorized") || message.includes("Invalid token")) {
    return new ActionError({
      code: "UNAUTHORIZED",
      message,
    });
  }

  return new ActionError({
    code: "INTERNAL_SERVER_ERROR",
    message,
  });
}

// Types
interface PickedPark {
  _id: string;
  name: string;
  customName?: string;
  address?: string;
  photoUrl?: string;
  photoUrls?: string[]; // All available photos for carousel
  placeId: string;
}

interface AddParkResult {
  success: boolean;
  park: {
    parkId: string;
    placeId: string;
    name: string;
    customName?: string;
    address?: string;
    visitCount: number;
  };
}

interface NearbyPark {
  _id: string;
  placeId: string;
  name: string;
  address?: string;
  distanceMiles: string;
  primaryType?: string;
  photoUrl?: string;
  photoUrls?: string[]; // All available photos
  isInUserList: boolean;
}

interface TodaysPickResult {
  _id: string;
  name: string;
  customName?: string;
  address?: string;
  photoUrl?: string;
  photoUrls?: string[]; // All available photos for carousel
  placeId: string;
  chosenAt: number;
}

export const server = {
  /**
   * Pick a random park from the user's list.
   * Enforces daily pick limits and no-repeat-in-5 logic.
   */
  pickPark: defineAction({
    handler: async (_input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<PickedPark>(
          convexUrl,
          "actions/pickPark:pickPark",
          {},
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Add a park to the user's list.
   * Enforces park limit for free users.
   */
  addPark: defineAction({
    input: z.object({
      parkId: z.string().min(1, "Park ID is required"),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callMutation<AddParkResult>(
          convexUrl,
          "userParks:addParkToUserList",
          { parkId: input.parkId },
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Remove a park from the user's list.
   */
  removePark: defineAction({
    input: z.object({
      parkId: z.string().min(1, "Park ID is required"),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callMutation<{ success: boolean }>(
          convexUrl,
          "userParks:removeParkFromUserList",
          { parkId: input.parkId },
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Search for parks near a location.
   */
  searchNearbyParks: defineAction({
    input: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusMiles: z.number().min(1).max(50).default(5),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<NearbyPark[]>(
          convexUrl,
          "actions/searchNearbyParks:searchNearbyParks",
          {
            lat: input.lat,
            lng: input.lng,
            radiusMiles: input.radiusMiles,
          },
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Seed a new user with recommended parks (onboarding).
   */
  seedUserWithRecommendedParks: defineAction({
    handler: async (_input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<{ success: boolean; parksAdded: number }>(
          convexUrl,
          "actions/seedUser:seedUserWithRecommendedParks",
          {},
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Store/update user after authentication.
   * Optionally processes referral code for new signups.
   */
  storeUser: defineAction({
    input: z
      .object({
        referralCode: z.string().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const args: Record<string, unknown> = {};
        if (input?.referralCode) {
          args.referralCode = input.referralCode;
        }

        const result = await callMutation<string>(convexUrl, "users:store", args, token);
        return { userId: result };
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Get user entitlements (tier, limits, usage).
   */
  getUserEntitlements: defineAction({
    handler: async (_input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callQuery<UserEntitlements | null>(
          convexUrl,
          "entitlements:getUserEntitlements",
          {},
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Calculate travel time from user location to a park.
   */
  getTravelTime: defineAction({
    input: z.object({
      originLat: z.number().min(-90).max(90),
      originLng: z.number().min(-180).max(180),
      placeId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<{ durationText: string; distanceText: string }>(
          convexUrl,
          "actions/getTravelTime:calculateTravelTime",
          {
            originLat: input.originLat,
            originLng: input.originLng,
            placeId: input.placeId,
          },
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Calculate travel distances to multiple parks in a single batch API call.
   * More efficient than individual calls. Max 25 place IDs per call.
   */
  getBatchTravelTime: defineAction({
    input: z.object({
      originLat: z.number().min(-90).max(90),
      originLng: z.number().min(-180).max(180),
      placeIds: z.array(z.string().min(1)).max(25),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<{
          [placeId: string]: { durationText: string; distanceText: string } | null;
        }>(
          convexUrl,
          "actions/getTravelTime:calculateBatchTravelTime",
          {
            originLat: input.originLat,
            originLng: input.originLng,
            placeIds: input.placeIds,
          },
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Get today's pick for the current user.
   * Returns the park picked today (if any) or null.
   */
  getTodaysPick: defineAction({
    handler: async (_input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();

      try {
        const result = await callAction<TodaysPickResult | null>(
          convexUrl,
          "actions/getTodaysPick:getTodaysPick",
          {},
          token
        );
        return result;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),

  /**
   * Get fresh photo URLs for a park.
   * Used for SSR cards that have photoRefs but need generated URLs.
   */
  getFreshPhotoUrls: defineAction({
    input: z.object({
      placeId: z.string().min(1, "Place ID is required"),
      maxPhotos: z.number().min(1).max(10).default(5),
    }),
    handler: async (input, context) => {
      const token = await getConvexToken(context);
      const convexUrl = getConvexUrl();
      const googleMapsApiKey = import.meta.env.GOOGLE_MAPS_API_KEY;

      if (!googleMapsApiKey) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Google Maps API key not configured",
        });
      }

      try {
        // Query the park by placeId to get photoRefs
        const park = await callQuery<{ photoRefs?: string[] } | null>(
          convexUrl,
          "parks:getByPlaceId",
          { placeId: input.placeId },
          token
        );

        if (!park || !park.photoRefs || park.photoRefs.length === 0) {
          return [];
        }

        // Generate photo URLs from refs
        const photoUrls = park.photoRefs.slice(0, input.maxPhotos).map((ref) => {
          return getPhotoUrlFromRef(ref, googleMapsApiKey, 800);
        });

        return photoUrls;
      } catch (error) {
        throw mapConvexError(error);
      }
    },
  }),
};
