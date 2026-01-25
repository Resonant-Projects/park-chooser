import { mutation } from "./_generated/server";

/**
 * SRQ Parks data from the Google Maps list: https://maps.app.goo.gl/no4T4TSWHBja1gsM7
 * Add customName to any park to give it a personal identifier.
 */
const srqParks: Array<{
  placeId: string;
  name: string;
  address: string;
  customName?: string;
}> = [
  {
    placeId: "ChIJyzMVWABBw4gR0LdJG3JubGw",
    name: "Locklear Park",
    address: "821 S Lockwood Ridge Rd, Sarasota, FL 34237, USA",
    customName: "Trail Park",
  },
  {
    placeId: "ChIJndUG4ipGw4gROWz8SnOmZj8",
    name: "Rothenbach Park",
    address: "8650 Bee Ridge Rd, Sarasota, FL 34241, USA",
    customName: "Deer Park",
  },
  {
    placeId: "ChIJ70rJA_w5w4gRrx0l1ukJBDc",
    name: "Waterside Park",
    address: "7500 Island Cove Terrace, Lakewood Ranch, FL 34240, USA",
    customName: "Splash Pad",
  },
  {
    placeId: "ChIJ7wa-IxRAw4gRnwt6LGL2yeM",
    name: "Bayfront Park",
    address: "5 Bayfront Dr, Sarasota, FL 34236, USA",
  },
  {
    placeId: "ChIJA29Zl5ZBw4gRgCgd4IJ52O8",
    name: "Avion Park",
    address: "436 N Pompano Ave Drive, Sarasota, FL 34237, USA",
    customName: "Blue Park",
  },
  {
    placeId: "ChIJ7YsXEMxBw4gRchvcb9pd3to",
    name: "Pompano Trailhead",
    address: "601 S Pompano Ave, Sarasota, FL 34237, USA",
  },
  {
    placeId: "ChIJxYJeVmlAw4gRNvmToAxA6pA",
    name: "Laurel Park",
    address: "Laurel Park, Sarasota, FL 34236, USA",
    customName: "Toy Park",
  },
  {
    placeId: "ChIJY2rFgrZBw4gRSmVrESIb7tQ",
    name: "Red Rock Park",
    address: "3987 Camino Real, Sarasota, FL 34231, USA",
  },
  {
    placeId: "ChIJV0yi5XdBw4gR8Mnd9UrwnlA",
    name: "Pioneer Park",
    address: "1260 12th St, Sarasota, FL 34236, USA",
    customName: "Aggie Park",
  },
  {
    placeId: "ChIJn61r9WVAw4gRXOJtD8DSQt4",
    name: "Payne Park",
    address: "2010 Adams Ln, Sarasota, FL 34237, USA",
    customName: "Ducky Park",
  },
  {
    placeId: "ChIJYSdb7qhBw4gRJyUw9vbao9Y",
    name: "Ashton Trailhead",
    address: "4281 Ashton Rd, Sarasota, FL 34233, USA",
    customName: "Orange Park",
  },
  {
    placeId: "ChIJTziSvydBw4gR7i_qxadnwpQ",
    name: "Sarasota Springs Trailhead",
    address: "4012 Webber St, Sarasota, FL 34232, USA",
    customName: "Tree Park",
  },
  {
    placeId: "ChIJ8SekLo9Gw4gR81Gftma1QvU",
    name: "Twin Lakes Park",
    address: "6700 Clark Rd, Sarasota, FL 34241, USA",
    customName: "Baseball Park",
  },
  {
    placeId: "ChIJQQfiSiVHw4gRJCg2DzEVcho",
    name: "Colonial Oaks Park",
    address: "5300 Colonial Oaks Blvd, Sarasota, FL 34232, USA",
    customName: "Airplane Park",
  },
  {
    placeId: "ChIJL8MDKe1Dw4gRjnOVD3yyv2k",
    name: "Potter Park Drive",
    address: "Potter Park Dr, Florida 34238, USA",
  },
  {
    placeId: "ChIJZc7_aZBBw4gRU5GoOod0gic",
    name: "Phillippi Estate Park",
    address: "5500 S Tamiami Trl, Sarasota, FL 34231, USA",
    customName: "Dock Park",
  },
  {
    placeId: "ChIJhRwCTPZAw4gROrb2GkpgkGQ",
    name: "Arlington Park Sarasota",
    address: "2650 Waldemere St, Sarasota, FL 34239, USA",
    customName: "Turtle Park",
  },
  {
    placeId: "ChIJ08zZpRpBw4gRiDJBlBXfAHw",
    name: "Bee Ridge Park",
    address: "4430 S Lockwood Ridge Rd, Sarasota, FL 34231, USA",
    customName: "Sand Park",
  },
  {
    placeId: "ChIJD0uXVl0_w4gRNkYBalb2Fgw",
    name: "Kensington Park",
    address: "Kensington Park, FL 34235, USA",
    customName: "Green Park",
  },
];

/**
 * Seed the database with SRQ Parks (fresh install only).
 * Run with: npx convex run seed:seedSRQParks
 */
export const seedSRQParks = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if we already have parks
    const existingParks = await ctx.db.query("parks").collect();
    if (existingParks.length > 0) {
      return {
        seeded: false,
        message:
          "Parks already exist. Run seed:clearParks first, or use seed:upsertSRQParks to update.",
        count: existingParks.length,
      };
    }

    const now = Date.now();
    for (const park of srqParks) {
      await ctx.db.insert("parks", {
        placeId: park.placeId,
        name: park.name,
        customName: park.customName,
        address: park.address,
        photoRefs: [],
        lastSynced: now,
      });
    }

    return {
      seeded: true,
      message: "Seeded SRQ Parks",
      count: srqParks.length,
    };
  },
});

/**
 * Clear all parks (for re-syncing).
 * Run with: npx convex run seed:clearParks
 */
export const clearParks = mutation({
  args: {},
  handler: async (ctx) => {
    const parks = await ctx.db.query("parks").collect();
    for (const park of parks) {
      await ctx.db.delete(park._id);
    }
    return { cleared: parks.length };
  },
});

/**
 * Clear all picks (for testing).
 * Run with: npx convex run seed:clearPicks
 */
export const clearPicks = mutation({
  args: {},
  handler: async (ctx) => {
    const picks = await ctx.db.query("picks").collect();
    for (const pick of picks) {
      await ctx.db.delete(pick._id);
    }
    return { cleared: picks.length };
  },
});

/**
 * Clear sync state (to force re-sync).
 * Run with: npx convex run seed:clearSyncState
 */
export const clearSyncState = mutation({
  args: {},
  handler: async (ctx) => {
    const syncState = await ctx.db.query("syncState").collect();
    for (const state of syncState) {
      await ctx.db.delete(state._id);
    }
    return { cleared: syncState.length };
  },
});

/**
 * Clean up duplicate parks that were created with incorrect placeIds.
 * Run with: npx convex run seed:cleanupDuplicates
 */
export const cleanupDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    // These are the incorrect placeIds that were in the original seed file
    const incorrectPlaceIds = [
      "ChIJyzMTAQBB0YURWJRJG6H_u6Y",
      "ChIJK0pSLKRB0YUR7c_1B0iFQoA",
      "ChIJYQKqL5tA0YURuIh0XHGB2oo",
      "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "ChIJF6_HJKRB0YURiNRpUq2UGs",
      "ChIJk6_HJKRB0YURiNRpUq2UGs",
      "ChIJP6_HJKRB0YURiNRpUq2UGs",
      "ChIJQ6_HJKRB0YURiNRpUq2UGs",
      "ChIJR6_HJKRB0YURiNRpUq2UGs",
      "ChIJS6_HJKRB0YURiNRpUq2UGs",
      "ChIJT6_HJKRB0YURiNRpUq2UGs",
      "ChIJU6_HJKRB0YURiNRpUq2UGs",
      "ChIJV6_HJKRB0YURiNRpUq2UGs",
      "ChIJW6_HJKRB0YURiNRpUq2UGs",
      "ChIJX6_HJKRB0YURiNRpUq2UGs",
      "ChIJY6_HJKRB0YURiNRpUq2UGs",
      "ChIJZ6_HJKRB0YURiNRpUq2UGs",
      "ChIJa6_HJKRB0YURiNRpUq2UGs",
      "ChIJb6_HJKRB0YURiNRpUq2UGs",
    ];

    let deleted = 0;
    for (const placeId of incorrectPlaceIds) {
      const park = await ctx.db
        .query("parks")
        .withIndex("by_placeId", (q) => q.eq("placeId", placeId))
        .unique();
      if (park) {
        await ctx.db.delete(park._id);
        deleted++;
      }
    }

    return { deleted, message: `Deleted ${deleted} duplicate parks` };
  },
});

/**
 * Upsert parks: updates existing parks and adds new ones.
 * Use this to add customName to existing parks or add new parks to the list.
 * Run with: npx convex run seed:upsertSRQParks
 */
export const upsertSRQParks = mutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    let inserted = 0;
    const now = Date.now();

    for (const park of srqParks) {
      const existing = await ctx.db
        .query("parks")
        .withIndex("by_placeId", (q) => q.eq("placeId", park.placeId))
        .unique();

      if (existing) {
        // Update existing park with new data (preserving photoRefs and visitCount)
        await ctx.db.patch(existing._id, {
          name: park.name,
          customName: park.customName,
          address: park.address,
          lastSynced: now,
        });
        updated++;
      } else {
        // Insert new park
        await ctx.db.insert("parks", {
          placeId: park.placeId,
          name: park.name,
          customName: park.customName,
          address: park.address,
          photoRefs: [],
          lastSynced: now,
        });
        inserted++;
      }
    }

    return {
      message: `Updated ${updated} parks, inserted ${inserted} new parks`,
      updated,
      inserted,
    };
  },
});
