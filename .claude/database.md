# Database Schema

All tables defined in `convex/schema.ts`. Convex auto-generates TypeScript types.

## Core Tables

### users

Synced from Clerk via webhooks. Never modify directly.

| Field           | Type    | Description                                 |
| --------------- | ------- | ------------------------------------------- |
| tokenIdentifier | string  | Clerk token (indexed)                       |
| clerkUserId     | string? | Clerk user ID for webhook lookups (indexed) |
| name            | string? | Display name                                |
| email           | string? | Primary email                               |
| imageUrl        | string? | Profile image URL                           |
| seededAt        | number? | Timestamp when default parks were added     |

### parks

Master catalog of all parks. Shared reference data.

| Field         | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| placeId       | string   | Google Place ID (indexed)          |
| name          | string   | Official park name                 |
| customName    | string?  | Default nickname                   |
| address       | string?  | Formatted address                  |
| photoRefs     | string[] | Google Places photo refs (expire!) |
| lastSynced    | number   | Sync timestamp                     |
| isRecommended | boolean? | Seed flag for new users            |
| lat/lng       | number?  | Coordinates for distance calc      |
| primaryType   | string?  | e.g., "park", "playground"         |

### userParks

Junction table linking users to their park lists.

| Field         | Type        | Description              |
| ------------- | ----------- | ------------------------ |
| userId        | Id<"users"> | Owner (indexed)          |
| parkId        | Id<"parks"> | Park reference           |
| customName    | string?     | User's personal nickname |
| addedAt       | number      | When added to list       |
| visitCount    | number      | Per-user visit tracking  |
| lastVisitedAt | number?     | Last visit timestamp     |
| notes         | string?     | User notes               |

**Indexes:** `by_user`, `by_user_park`, `by_user_visits`

### picks

Park selection history.

| Field      | Type             | Description                    |
| ---------- | ---------------- | ------------------------------ |
| parkId     | Id<"parks">      | Selected park                  |
| userId     | Id<"users">?     | User who picked                |
| userParkId | Id<"userParks">? | Reference to user's park entry |
| chosenAt   | number           | Selection timestamp (indexed)  |

**Indexes:** `by_chosenAt`, `by_user_chosenAt`

## Entitlement Tables

### userEntitlements

Subscription status synced from Clerk Billing.

| Field                   | Type                                                 | Description               |
| ----------------------- | ---------------------------------------------------- | ------------------------- |
| userId                  | Id<"users">                                          | User reference (indexed)  |
| tier                    | "free" \| "premium"                                  | Current tier              |
| clerkSubscriptionId     | string?                                              | Clerk sub ID              |
| clerkSubscriptionItemId | string?                                              | Clerk item ID (indexed)   |
| status                  | "active" \| "past_due" \| "canceled" \| "incomplete" | Sub status                |
| periodStart/End         | number?                                              | Billing period timestamps |

### dailyPickCounts

Rate limiting for free tier.

| Field     | Type        | Description           |
| --------- | ----------- | --------------------- |
| userId    | Id<"users"> | User reference        |
| date      | string      | ISO date "YYYY-MM-DD" |
| pickCount | number      | Picks made today      |

**Index:** `by_user_date` (composite)

## Referral Tables

### referralCodes

User-friendly referral codes.

| Field          | Type        | Description                       |
| -------------- | ----------- | --------------------------------- |
| userId         | Id<"users"> | Code owner                        |
| code           | string      | Format: "USERNAME-XXXX" (indexed) |
| isActive       | boolean     | Can be used                       |
| totalReferrals | number      | Successful referral count         |

### referrals

Tracks referral relationships.

| Field                   | Type                                                                | Description         |
| ----------------------- | ------------------------------------------------------------------- | ------------------- |
| referrerId              | Id<"users">                                                         | Who shared the code |
| refereeId               | Id<"users">                                                         | Who signed up       |
| status                  | "pending" \| "converted" \| "rewarded" \| "expired" \| "fraudulent" | Referral state      |
| signupIpHash            | string?                                                             | Fraud detection     |
| signupDeviceFingerprint | string?                                                             | Fraud detection     |

### referralRewards

Bonus days granted to referrers.

| Field              | Type            | Description                |
| ------------------ | --------------- | -------------------------- |
| userId             | Id<"users">     | Reward recipient           |
| referralId         | Id<"referrals"> | Source referral            |
| rewardType         | "free_month"    | Reward type                |
| bonusDaysStart/End | number?         | Premium bonus period       |
| discountCode       | string?         | Alternative: discount code |

**Index:** `by_user_active` - for checking active bonus days

## Support Tables

### supportTickets

Contact form submissions.

| Field       | Type                                             | Description             |
| ----------- | ------------------------------------------------ | ----------------------- |
| email       | string                                           | Contact email           |
| subject     | "bug" \| "billing" \| "feature" \| "other"       | Category                |
| message     | string                                           | Ticket content          |
| status      | "new" \| "in_progress" \| "resolved" \| "closed" | Ticket state            |
| referenceId | string                                           | User-friendly ticket ID |

### feedback

User feedback submissions.

| Field            | Type        | Description    |
| ---------------- | ----------- | -------------- |
| userId           | Id<"users"> | Submitter      |
| rating           | number      | 1-5 stars      |
| likesText        | string?     | What they like |
| improvementsText | string?     | Suggestions    |

### rateLimits

Spam prevention.

| Field       | Type   | Description                 |
| ----------- | ------ | --------------------------- |
| identifier  | string | IP hash or user ID          |
| action      | string | "contact", "feedback", etc. |
| count       | number | Request count in window     |
| windowStart | number | Window start timestamp      |

## Common Patterns

### Looking up users

```typescript
// By Clerk token (from auth identity)
const user = await ctx.db
  .query("users")
  .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
  .unique();

// By Clerk user ID (from webhook)
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
  .unique();
```

### Getting user's parks

```typescript
const userParks = await ctx.db
  .query("userParks")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

### Checking active bonus days

```typescript
const now = Date.now();
const activeBonus = await ctx.db
  .query("referralRewards")
  .withIndex("by_user_active", (q) => q.eq("userId", userId).gt("bonusDaysEnd", now))
  .first();
```
