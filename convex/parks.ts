import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";

/**
 * List all parks in the master catalog
 */
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("parks").collect();
	},
});

/**
 * Get park by place ID
 */
export const getByPlaceId = query({
	args: { placeId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("parks")
			.withIndex("by_placeId", (q) => q.eq("placeId", args.placeId))
			.unique();
	},
});

/**
 * Internal: Get park by ID
 */
export const getById = internalQuery({
	args: { id: v.id("parks") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

/**
 * Get sync state
 */
export const getSyncState = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("syncState").first();
	},
});

/**
 * Update sync state
 */
export const updateSyncState = internalMutation({
	args: { lastSyncedAt: v.number() },
	handler: async (ctx, args) => {
		const existing = await ctx.db.query("syncState").first();

		if (existing) {
			await ctx.db.patch(existing._id, { lastSyncedAt: args.lastSyncedAt });
		} else {
			await ctx.db.insert("syncState", { lastSyncedAt: args.lastSyncedAt });
		}
	},
});

/**
 * Upsert parks from sync action (recommended parks from SRQ list)
 */
export const upsertParks = internalMutation({
	args: {
		parks: v.array(
			v.object({
				placeId: v.string(),
				name: v.string(),
				address: v.optional(v.string()),
				photoRefs: v.array(v.string()),
			})
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		for (const park of args.parks) {
			const existing = await ctx.db
				.query("parks")
				.withIndex("by_placeId", (q) => q.eq("placeId", park.placeId))
				.unique();

			if (existing) {
				await ctx.db.patch(existing._id, {
					name: park.name,
					address: park.address,
					photoRefs: park.photoRefs,
					lastSynced: now,
					isRecommended: true,
				});
			} else {
				await ctx.db.insert("parks", {
					placeId: park.placeId,
					name: park.name,
					address: park.address,
					photoRefs: park.photoRefs,
					lastSynced: now,
					isRecommended: true,
				});
			}
		}
	},
});

/**
 * Upsert discovered parks from nearby search (not marked as recommended)
 */
export const upsertDiscoveredParks = internalMutation({
	args: {
		parks: v.array(
			v.object({
				placeId: v.string(),
				name: v.string(),
				address: v.optional(v.string()),
				photoRefs: v.array(v.string()),
				lat: v.number(),
				lng: v.number(),
				primaryType: v.optional(v.string()),
			})
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const results: Array<{ placeId: string; _id: Id<"parks"> }> = [];

		for (const park of args.parks) {
			const existing = await ctx.db
				.query("parks")
				.withIndex("by_placeId", (q) => q.eq("placeId", park.placeId))
				.unique();

			if (existing) {
				// Update existing park with new data
				await ctx.db.patch(existing._id, {
					name: park.name,
					address: park.address,
					photoRefs: park.photoRefs,
					lat: park.lat,
					lng: park.lng,
					primaryType: park.primaryType,
					lastSynced: now,
				});
				results.push({ placeId: park.placeId, _id: existing._id });
			} else {
				// Insert new park
				const newId = await ctx.db.insert("parks", {
					placeId: park.placeId,
					name: park.name,
					address: park.address,
					photoRefs: park.photoRefs,
					lat: park.lat,
					lng: park.lng,
					primaryType: park.primaryType,
					discoveredAt: now,
					lastSynced: now,
				});
				results.push({ placeId: park.placeId, _id: newId });
			}
		}

		return results;
	},
});
