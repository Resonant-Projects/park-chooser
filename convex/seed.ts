import { mutation } from "./_generated/server";

/**
 * Seed the database with sample parks for testing.
 * Run with: npx convex run seed:seedParks
 */
export const seedParks = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if we already have parks
    const existingParks = await ctx.db.query("parks").collect();
    if (existingParks.length > 0) {
      return { seeded: false, message: "Parks already exist", count: existingParks.length };
    }

    const sampleParks = [
      {
        placeId: "ChIJBYpG4FcVkFQRMKMj6aGu6HQ",
        name: "Discovery Park",
        address: "3801 Discovery Park Blvd, Seattle, WA 98199",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJVTPokywQkFQRmtVoG6H_u6Y",
        name: "Gas Works Park",
        address: "2101 N Northlake Way, Seattle, WA 98103",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJ7cv00DwVkFQROiNRpUq2UGs",
        name: "Golden Gardens Park",
        address: "8498 Seaview Pl NW, Seattle, WA 98117",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJc-wLChYUkFQRHUhQ9p3fqbA",
        name: "Volunteer Park",
        address: "1247 15th Ave E, Seattle, WA 98112",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJAx7UL8IVkFQR86Iqc-fUncc",
        name: "Carkeek Park",
        address: "950 NW Carkeek Park Rd, Seattle, WA 98177",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJvz-Jz4oUkFQRj6t0XHGB2oo",
        name: "Cal Anderson Park",
        address: "1635 11th Ave, Seattle, WA 98122",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJzQMx6vBBkFQR0iFQoAi7Hxk",
        name: "Seward Park",
        address: "5900 Lake Washington Blvd S, Seattle, WA 98118",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJtRkkqIJqkFQRLsOKQroRdQQ",
        name: "Marymoor Park",
        address: "6046 W Lake Sammamish Pkwy NE, Redmond, WA 98052",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJyWEHuEmuEmsRm9hTkapTCrk",
        name: "Green Lake Park",
        address: "7201 E Green Lake Dr N, Seattle, WA 98115",
        photoRefs: [],
        lastSynced: Date.now(),
      },
      {
        placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        name: "Kerry Park",
        address: "211 W Highland Dr, Seattle, WA 98119",
        photoRefs: [],
        lastSynced: Date.now(),
      },
    ];

    for (const park of sampleParks) {
      await ctx.db.insert("parks", park);
    }

    return { seeded: true, message: "Seeded sample parks", count: sampleParks.length };
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

