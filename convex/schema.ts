import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users from Clerk
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    seededAt: v.optional(v.number()), // Track when user was seeded with parks
  }).index("by_token", ["tokenIdentifier"]),

  // Master park catalog (shared reference data)
  parks: defineTable({
    placeId: v.string(),
    name: v.string(),
    customName: v.optional(v.string()), // Default nickname (can be overridden per-user)
    address: v.optional(v.string()),
    photoRefs: v.array(v.string()), // Google Places photo references
    lastSynced: v.number(), // timestamp
    isRecommended: v.optional(v.boolean()), // Flag for recommended parks (seeding)
  }).index("by_placeId", ["placeId"]),

  // User-specific park list (junction table)
  userParks: defineTable({
    userId: v.id("users"),
    parkId: v.id("parks"),
    customName: v.optional(v.string()), // User's personal nickname (overrides park default)
    addedAt: v.number(),
    visitCount: v.number(), // Per-user visit tracking
    lastVisitedAt: v.optional(v.number()),
    notes: v.optional(v.string()), // Optional user notes about the park
  })
    .index("by_user", ["userId"])
    .index("by_user_park", ["userId", "parkId"])
    .index("by_user_visits", ["userId", "visitCount"]),

  // History of park picks
  picks: defineTable({
    parkId: v.id("parks"),
    userId: v.optional(v.id("users")), // Optional during migration, will backfill
    userParkId: v.optional(v.id("userParks")), // Reference to userParks entry
    chosenAt: v.number(), // timestamp
  })
    .index("by_chosenAt", ["chosenAt"])
    .index("by_user_chosenAt", ["userId", "chosenAt"]),

  // Sync metadata (single document)
  syncState: defineTable({
    lastSyncedAt: v.number(),
  }),
});
