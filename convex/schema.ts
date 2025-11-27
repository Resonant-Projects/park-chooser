import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Parks synced from the Google Maps list
  parks: defineTable({
    placeId: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    photoRefs: v.array(v.string()), // Google Places photo references
    lastSynced: v.number(), // timestamp
    visitCount: v.optional(v.number()), // number of times user opened in Google Maps
  }).index("by_placeId", ["placeId"]),

  // History of park picks
  picks: defineTable({
    parkId: v.id("parks"),
    chosenAt: v.number(), // timestamp
  }).index("by_chosenAt", ["chosenAt"]),

  // Sync metadata (single document)
  syncState: defineTable({
    lastSyncedAt: v.number(),
  }),
});
