import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Users from Clerk
	users: defineTable({
		tokenIdentifier: v.optional(v.string()), // Set when user authenticates via JWT (may be undefined for webhook-created users)
		clerkUserId: v.optional(v.string()), // Clerk user ID (e.g., user_2g7np...) for webhook lookups
		name: v.optional(v.string()),
		email: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		seededAt: v.optional(v.number()), // Track when user was seeded with parks
	})
		.index("by_token", ["tokenIdentifier"])
		.index("by_clerk_user_id", ["clerkUserId"]),

	// Master park catalog (shared reference data)
	parks: defineTable({
		placeId: v.string(),
		name: v.string(),
		customName: v.optional(v.string()), // Default nickname (can be overridden per-user)
		address: v.optional(v.string()),
		photoRefs: v.array(v.string()), // Google Places photo references
		lastSynced: v.number(), // timestamp
		isRecommended: v.optional(v.boolean()), // Flag for recommended parks (seeding)
		// Location discovery fields
		lat: v.optional(v.number()), // Latitude for distance calculations
		lng: v.optional(v.number()), // Longitude for distance calculations
		discoveredAt: v.optional(v.number()), // When first discovered via nearby search
		primaryType: v.optional(v.string()), // e.g., "park", "playground", "dog_park"
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

	// Support tickets from contact form
	supportTickets: defineTable({
		email: v.string(),
		subject: v.union(
			v.literal("bug"),
			v.literal("billing"),
			v.literal("feature"),
			v.literal("other")
		),
		message: v.string(),
		userId: v.optional(v.id("users")),
		status: v.union(
			v.literal("new"),
			v.literal("in_progress"),
			v.literal("resolved"),
			v.literal("closed")
		),
		referenceId: v.string(), // User-friendly ticket ID
		createdAt: v.number(),
		respondedAt: v.optional(v.number()),
		ipHash: v.optional(v.string()), // Hashed IP for rate limiting
	})
		.index("by_status", ["status"])
		.index("by_email", ["email"])
		.index("by_reference", ["referenceId"])
		.index("by_created", ["createdAt"]),

	// User feedback submissions
	feedback: defineTable({
		userId: v.id("users"),
		rating: v.number(), // 1-5 stars
		likesText: v.optional(v.string()),
		improvementsText: v.optional(v.string()),
		featureRequestsText: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_created", ["createdAt"]),

	// Rate limiting for spam prevention
	rateLimits: defineTable({
		identifier: v.string(), // IP hash or user ID
		action: v.string(), // "contact", "feedback", etc.
		count: v.number(),
		windowStart: v.number(), // Timestamp of window start
	}).index("by_identifier_action", ["identifier", "action"]),

	// User subscription/entitlement data synced from Clerk Billing
	userEntitlements: defineTable({
		userId: v.id("users"),
		tier: v.union(v.literal("free"), v.literal("premium")),
		// Clerk Billing identifiers for webhook reconciliation
		clerkSubscriptionId: v.optional(v.string()),
		clerkSubscriptionItemId: v.optional(v.string()),
		clerkPlanId: v.optional(v.string()),
		// Billing period tracking (for premium users)
		periodStart: v.optional(v.number()),
		periodEnd: v.optional(v.number()),
		// Trial tracking (Clerk uses same period_start/period_end for trials)
		isFreeTrial: v.optional(v.boolean()),
		// Status tracking
		status: v.union(
			v.literal("active"),
			v.literal("past_due"),
			v.literal("canceled"),
			v.literal("incomplete")
		),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_clerk_subscription_item", ["clerkSubscriptionItemId"]),

	// Daily pick tracking for rate limiting free tier
	dailyPickCounts: defineTable({
		userId: v.id("users"),
		date: v.string(), // ISO date format: "2026-01-14"
		pickCount: v.number(),
	}).index("by_user_date", ["userId", "date"]),

	// Share links for referrals and park list sharing
	shareLinks: defineTable({
		userId: v.id("users"),
		token: v.string(), // Unique token for the share link
		type: v.union(v.literal("referral"), v.literal("park_list")),
		isActive: v.boolean(),
		createdAt: v.number(),
		expiresAt: v.optional(v.number()), // Optional expiration for park list shares
		accessCount: v.number(), // Track how many times link was accessed
	})
		.index("by_token", ["token"])
		.index("by_user_type", ["userId", "type"]),

	// Referral codes for user-friendly sharing (e.g., KEITH-A7X2)
	referralCodes: defineTable({
		userId: v.id("users"),
		code: v.string(), // User-friendly code format: USERNAME-XXXX
		isActive: v.boolean(),
		totalReferrals: v.number(), // Count of successful referrals
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_code", ["code"]),

	// Track referral relationships
	referrals: defineTable({
		referrerId: v.id("users"), // User who shared the code
		refereeId: v.id("users"), // User who signed up with the code
		referralCodeId: v.id("referralCodes"),
		status: v.union(
			v.literal("pending"), // Signed up, not subscribed
			v.literal("converted"), // First payment made
			v.literal("rewarded"), // Referrer got free month
			v.literal("expired"), // Never converted (90 days)
			v.literal("fraudulent") // Blocked for suspicious activity
		),
		signupAt: v.number(),
		convertedAt: v.optional(v.number()),
		rewardGrantedAt: v.optional(v.number()),
		// Fraud detection signals
		signupIpHash: v.optional(v.string()),
		signupDeviceFingerprint: v.optional(v.string()),
		fraudReason: v.optional(v.string()), // Reason when marked as fraudulent
	})
		.index("by_referrer", ["referrerId"])
		.index("by_referee", ["refereeId"])
		.index("by_status", ["status"])
		.index("by_ip_hash", ["signupIpHash"])
		.index("by_device_fingerprint", ["signupDeviceFingerprint"])
		.index("by_status_signupAt", ["status", "signupAt"])
		.index("by_referral_code", ["referralCodeId"]),

	// Track referral rewards (bonus days or discount codes)
	referralRewards: defineTable({
		userId: v.id("users"),
		referralId: v.id("referrals"),
		rewardType: v.literal("free_month"),
		grantedAt: v.number(),
		// Bonus days approach (for existing subscribers)
		bonusDaysStart: v.optional(v.number()),
		bonusDaysEnd: v.optional(v.number()), // 30 days after start
		// Discount code approach (for free-tier referrers)
		discountCode: v.optional(v.string()),
		discountUsedAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_user_active", ["userId", "bonusDaysEnd"])
		.index("by_discount_code", ["discountCode"]),

	// Fraud detection signals for rate limiting referral abuse
	referralFraudSignals: defineTable({
		identifier: v.string(), // IP hash or device fingerprint
		signalType: v.string(), // "ip_multiple_signups", "device_multiple_signups", etc.
		count: v.number(),
		firstSeenAt: v.number(),
		lastSeenAt: v.number(),
	}).index("by_identifier_type", ["identifier", "signalType"]),

	// Failed referral rewards for retry/recovery
	failedReferralRewards: defineTable({
		referralId: v.id("referrals"),
		userId: v.id("users"),
		rewardType: v.union(v.literal("bonus_days"), v.literal("discount_code")),
		error: v.string(),
		retryCount: v.number(),
		lastAttemptAt: v.number(),
		status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("escalated")),
		createdAt: v.number(),
	})
		.index("by_status", ["status"])
		.index("by_referral", ["referralId"]),
});
