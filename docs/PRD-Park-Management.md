# Product Requirements Document: Park Management Feature

**Version:** 1.0
**Created:** 2026-01-14
**Author:** Atlas (Principal Software Architect)
**Status:** Ready for Implementation

---

## Executive Summary

### Project Overview

Build a mobile-first Park Management page that enables authenticated users to curate their personal park list. Users can add parks from the master catalog or remove parks from their list, with the "Pick a Park" feature already pulling from this user-specific list.

### Success Metrics

| Metric                  | Target                                        | Measurement         |
| ----------------------- | --------------------------------------------- | ------------------- |
| Time to add/remove park | < 2 taps                                      | User testing        |
| Page load time          | < 1.5s                                        | Lighthouse          |
| Mobile tap target size  | >= 44px                                       | Accessibility audit |
| User engagement         | 80% of users customize list within first week | Analytics           |

### Technical Stack (Pre-existing)

- **Frontend:** Astro 4.x with Starwind UI components
- **Backend:** Convex (serverless functions + real-time database)
- **Authentication:** Clerk (already integrated)
- **Styling:** Tailwind CSS v4 (via Vite plugin)

### Current State Assessment

The backend infrastructure is **90% complete**:

- Schema: `userParks` junction table exists with proper indexes
- Mutations: `addParkToUserList`, `removeParkFromUserList`, `updateUserPark` exist
- Queries: `listUserParks`, `getUserParkCount` exist
- Integration: `pickPark` action already uses user's park list

**What's Missing:**

1. Park Management UI page (`/manage`)
2. Query to get available parks (not in user's list)
3. Client-side helper functions in `convexClient.ts`
4. Mobile-optimized add/remove UX

### Timeline Estimate

| Milestone                       | Duration       | Dependencies |
| ------------------------------- | -------------- | ------------ |
| Milestone 1: Core Management    | 4-6 hours      | None         |
| Milestone 2: Polished UX        | 2-3 hours      | Milestone 1  |
| Milestone 3: Integration Polish | 1-2 hours      | Milestone 2  |
| **Total**                       | **7-11 hours** |              |

---

## System Architecture

### High-Level Component Diagram

```
+------------------+     +------------------+     +------------------+
|   /manage page   |---->|  Convex Client   |---->|  Convex Backend  |
|   (Astro + JS)   |     |  (HTTP calls)    |     |  (Mutations/     |
|                  |     |                  |     |   Queries)       |
+------------------+     +------------------+     +------------------+
         |                                                  |
         v                                                  v
+------------------+                              +------------------+
|  Clerk Auth      |                              |  Database        |
|  (UserButton,    |                              |  - users         |
|   getToken)      |                              |  - parks         |
+------------------+                              |  - userParks     |
                                                  +------------------+
```

### Data Flow: Add Park

```
User taps [+ Add] button
         |
         v
Client-side JS: addParkToList(parkId)
         |
         v
HTTP POST to Convex /api/mutation
  - path: "userParks:addParkToUserList"
  - args: { parkId }
  - headers: { Authorization: Bearer <token> }
         |
         v
Convex mutation validates:
  1. User authenticated
  2. Park exists in catalog
  3. Park not already in user list
         |
         v
Insert into userParks table
         |
         v
Return { added: true, userParkId }
         |
         v
Client updates UI (optimistic update pattern)
```

### Data Flow: Remove Park

```
User taps [Remove] button on park card
         |
         v
Client-side JS: removeParkFromList(parkId)
         |
         v
HTTP POST to Convex /api/mutation
  - path: "userParks:removeParkFromUserList"
  - args: { parkId }
         |
         v
Convex mutation:
  1. Find userPark by userId + parkId
  2. Delete the document
         |
         v
Return { removed: true }
         |
         v
Client updates UI (remove card with animation)
```

---

## Database Schema

### Existing Tables (No Changes Required)

The schema is already complete. Here's the relevant structure:

```typescript
// convex/schema.ts - EXISTING (no changes)

// Master park catalog
parks: defineTable({
  placeId: v.string(),
  name: v.string(),
  customName: v.optional(v.string()),
  address: v.optional(v.string()),
  photoRefs: v.array(v.string()),
  lastSynced: v.number(),
  isRecommended: v.optional(v.boolean()),
}).index("by_placeId", ["placeId"]),

// User-specific park relationships
userParks: defineTable({
  userId: v.id("users"),
  parkId: v.id("parks"),
  customName: v.optional(v.string()),
  addedAt: v.number(),
  visitCount: v.number(),
  lastVisitedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_park", ["userId", "parkId"])
  .index("by_user_visits", ["userId", "visitCount"]),
```

### Index Usage Patterns

| Query/Mutation            | Index Used         | Purpose                        |
| ------------------------- | ------------------ | ------------------------------ |
| `listUserParks`           | `by_user`          | Get all parks for current user |
| `addParkToUserList`       | `by_user_park`     | Check if park already added    |
| `removeParkFromUserList`  | `by_user_park`     | Find specific user-park entry  |
| `getAvailableParks` (NEW) | `by_user` + filter | Get parks NOT in user's list   |

---

## Feature Breakdown

### Feature 1: Park Management Page (`/manage`)

#### User Stories

**US1.1: View My Parks**

> As an authenticated user, I want to see all parks in my personal list so I can understand what parks I might be randomly selected from.

**Acceptance Criteria:**

- [ ] Page displays all parks from `userParks` for current user
- [ ] Each park shows: name, custom name (if set), address
- [ ] Parks sorted alphabetically by name
- [ ] Visit count badge shown on each park
- [ ] Empty state shown if no parks in list

**US1.2: Remove a Park**

> As an authenticated user, I want to remove a park from my list so it won't appear in random selection.

**Acceptance Criteria:**

- [ ] Each park card has a remove button (trash icon or "Remove")
- [ ] Tap triggers confirmation (prevent accidental removal)
- [ ] Successful removal animates card out
- [ ] Toast/feedback confirms removal
- [ ] Cannot remove if it's the only park (minimum 1 required)

**US1.3: Add New Park**

> As an authenticated user, I want to add parks from the master catalog to my personal list.

**Acceptance Criteria:**

- [ ] "Add Parks" button expands to show available parks
- [ ] Available parks = master catalog minus user's current list
- [ ] Each available park has "Add" button
- [ ] Adding immediately reflects in UI
- [ ] Newly added park appears in "My Parks" section

---

### Feature 2: Available Parks Catalog

#### User Stories

**US2.1: Browse Available Parks**

> As an authenticated user, I want to browse parks I haven't added yet so I can expand my park list.

**Acceptance Criteria:**

- [ ] Expandable section shows parks not in user's list
- [ ] Parks show name, address, and photo thumbnail
- [ ] Large tap targets (44px minimum) for mobile
- [ ] Loading state while fetching catalog

**US2.2: Quick Add**

> As an authenticated user, I want to add a park with one tap for fast list building.

**Acceptance Criteria:**

- [ ] Single tap on "+" adds park immediately
- [ ] No confirmation needed for adding (reversible action)
- [ ] Optimistic UI update (instant feedback)
- [ ] Park moves from "Available" to "My Parks" section

---

### Feature 3: Empty State & Onboarding

#### User Stories

**US3.1: New User Experience**

> As a new user with no parks, I want clear guidance on how to build my park list.

**Acceptance Criteria:**

- [ ] If user has 0 parks, show welcoming empty state
- [ ] "Get Started" CTA prompts adding first parks
- [ ] Optional: "Add All Recommended" quick action
- [ ] Clear value proposition (why add parks)

**US3.2: All Parks Removed**

> As a user who removed all parks, I want to easily add new ones.

**Acceptance Criteria:**

- [ ] Different messaging than new user (acknowledges removal)
- [ ] Cannot pick a park with empty list (clear error message)
- [ ] Direct link back to /manage page from error

---

## UI Components Specification

### File Structure

```
src/
├── pages/
│   └── manage.astro          # NEW: Park management page
├── components/
│   ├── starwind/             # EXISTING: UI primitives
│   │   ├── badge/
│   │   ├── button/
│   │   ├── card/
│   │   ├── separator/
│   │   ├── spinner/
│   │   └── table/
│   └── parks/                # NEW: Park-specific components
│       ├── ParkCard.astro    # NEW: Single park display
│       └── EmptyState.astro  # NEW: No parks message
└── lib/
    └── convexClient.ts       # UPDATE: Add new helper functions
```

### Component: `/pages/manage.astro`

**Purpose:** Main park management page with two sections: My Parks + Available Parks

**Template Structure:**

```astro
---
// Server-side: fetch user's parks and available parks
import { getUserParks, getAvailableParks } from "../lib/convexClient";
// Clerk auth
const { userId, getToken } = Astro.locals.auth();
// Redirect if not authenticated
if (!userId) return Astro.redirect("/sign-in");
// Fetch data server-side
const token = await getToken({ template: "convex" });
const userParks = await getUserParks(token);
const availableParks = await getAvailableParks(token);
---

<html>
  <body>
    <div class="container">
      <header><!-- Title + UserButton --></header>

      <main>
        <!-- Section 1: My Parks -->
        <section id="my-parks">
          {
            userParks.length === 0 ? (
              <EmptyState />
            ) : (
              <div class="park-grid">
                {userParks.map((park) => (
                  <ParkCard park={park} mode="remove" />
                ))}
              </div>
            )
          }
        </section>

        <!-- Section 2: Add Parks (collapsible) -->
        <section id="available-parks">
          <button id="toggle-available">Add Parks ({availableParks.length})</button>
          <div class="available-grid hidden">
            {availableParks.map((park) => <ParkCard park={park} mode="add" />)}
          </div>
        </section>
      </main>
    </div>

    <script>
      // Client-side: handle add/remove with optimistic updates
    </script>
  </body>
</html>
```

**Props:**

- `userParks`: Array of user's parks with details
- `availableParks`: Array of parks not in user's list

**Accessibility:**

- Semantic HTML structure (`<main>`, `<section>`, `<article>`)
- ARIA labels on interactive elements
- Focus management after add/remove
- Keyboard navigation support

### Component: `ParkCard.astro`

**Purpose:** Reusable card for displaying a single park with action button

**Props:**

```typescript
interface ParkCardProps {
  park: {
    _id: string; // userPark._id or park._id depending on mode
    parkId?: string; // park._id (for remove mode)
    name: string;
    customName?: string;
    address?: string;
    visitCount?: number;
  };
  mode: "add" | "remove";
}
```

**Visual Design:**

- Card with white/cream background
- Name in Fraunces font (primary)
- Custom name as subtitle if present
- Address in smaller text
- Visit count badge (remove mode only)
- Action button: + (add) or trash (remove)
- Minimum height: 80px for good tap targets

**States:**

- Default
- Hover (subtle elevation/shadow)
- Loading (during mutation)
- Removed (fade-out animation)

### Component: `EmptyState.astro`

**Purpose:** Friendly message when user has no parks

**Props:**

```typescript
interface EmptyStateProps {
  isNewUser?: boolean; // Different copy for new vs cleared lists
}
```

**Content (New User):**

```
Title: "Build Your Park List"
Body: "Add parks from the catalog to create your personalized selection pool.
       When you pick a park, it'll be randomly chosen from your list."
CTA: "Browse Parks to Add"
```

**Content (Cleared List):**

```
Title: "Your List is Empty"
Body: "You've removed all parks. Add some back to start picking again."
CTA: "Add Parks"
```

---

## Backend Function Specifications

### NEW Query: `getAvailableParks`

**File:** `/convex/parks.ts`

**Purpose:** Get all parks from master catalog that are NOT in the user's list

```typescript
/**
 * Get parks available for user to add (not already in their list).
 */
export const getAvailableParks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return all parks for unauthenticated (preview)
      return await ctx.db.query("parks").collect();
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return await ctx.db.query("parks").collect();
    }

    // Get user's current park IDs
    const userParks = await ctx.db
      .query("userParks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userParkIds = new Set(userParks.map((up) => up.parkId.toString()));

    // Get all parks, filter out user's parks
    const allParks = await ctx.db.query("parks").collect();

    return allParks.filter((park) => !userParkIds.has(park._id.toString()));
  },
});
```

**Returns:**

```typescript
Array<{
  _id: Id<"parks">;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  photoRefs: string[];
}>;
```

### UPDATE: Client Functions in `convexClient.ts`

Add new helper functions:

```typescript
// Types
interface UserPark {
  _id: string;
  parkId: string;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  visitCount: number;
  lastVisitedAt?: number;
  addedAt: number;
}

interface CatalogPark {
  _id: string;
  placeId: string;
  name: string;
  customName?: string;
  address?: string;
  photoRefs: string[];
}

interface AddResult {
  added: boolean;
  userParkId?: string;
  message: string;
}

interface RemoveResult {
  removed: boolean;
  message: string;
}

/**
 * Get all parks in user's list with details.
 */
export async function getUserParks(token: string): Promise<UserPark[]> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<UserPark[]>(convexUrl, "userParks:listUserParks", {}, token);
}

/**
 * Get parks available to add (not in user's list).
 */
export async function getAvailableParks(token: string): Promise<CatalogPark[]> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callQuery<CatalogPark[]>(convexUrl, "parks:getAvailableParks", {}, token);
}

/**
 * Add a park to user's list.
 */
export async function addParkToList(token: string, parkId: string): Promise<AddResult> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callMutation<AddResult>(convexUrl, "userParks:addParkToUserList", { parkId }, token);
}

/**
 * Remove a park from user's list.
 */
export async function removeParkFromList(token: string, parkId: string): Promise<RemoveResult> {
  const convexUrl = import.meta.env.CONVEX_URL;
  if (!convexUrl) throw new Error("CONVEX_URL not set");
  return callMutation<RemoveResult>(
    convexUrl,
    "userParks:removeParkFromUserList",
    { parkId },
    token
  );
}
```

### EXISTING Functions (No Changes Needed)

These backend functions already exist and are production-ready:

| Function                 | File           | Purpose                       |
| ------------------------ | -------------- | ----------------------------- |
| `addParkToUserList`      | `userParks.ts` | Add park to user's list       |
| `removeParkFromUserList` | `userParks.ts` | Remove park from user's list  |
| `listUserParks`          | `userParks.ts` | Get user's parks with details |
| `getUserParkCount`       | `userParks.ts` | Count parks in user's list    |
| `updateUserPark`         | `userParks.ts` | Update custom name/notes      |

---

## Implementation Milestones

### Milestone 1: Core Management (4-6 hours)

**Goal:** Basic add/remove functionality with working UI

#### Tasks

**1.1 Backend: Add `getAvailableParks` query**

- [ ] Add query to `convex/parks.ts`
- [ ] Test via Convex dashboard
- [ ] Verify filtering works correctly

**1.2 Client: Add helper functions**

- [ ] Add `getUserParks()` to `convexClient.ts`
- [ ] Add `getAvailableParks()` to `convexClient.ts`
- [ ] Add `addParkToList()` to `convexClient.ts`
- [ ] Add `removeParkFromList()` to `convexClient.ts`
- [ ] Add TypeScript interfaces

**1.3 UI: Create `/manage` page**

- [ ] Create `/src/pages/manage.astro`
- [ ] Add header with navigation back to home
- [ ] Add "My Parks" section
- [ ] Implement park list display
- [ ] Add remove button to each park
- [ ] Implement client-side remove handler
- [ ] Add loading states

**1.4 UI: Add Parks section**

- [ ] Add collapsible "Add Parks" section
- [ ] Display available parks
- [ ] Implement add button handler
- [ ] Update UI after successful add

**1.5 Navigation: Link from home/stats**

- [ ] Add "Manage Parks" link to index.astro
- [ ] Add "Manage Parks" link to stats.astro
- [ ] Verify navigation flow

#### Acceptance Criteria (M1)

- [ ] User can view their park list at `/manage`
- [ ] User can remove a park with one tap + confirmation
- [ ] User can add a park from available list
- [ ] Changes persist after page refresh
- [ ] Loading states shown during mutations

---

### Milestone 2: Polished UX (2-3 hours)

**Goal:** Mobile-optimized experience with animations and edge cases

#### Tasks

**2.1 Empty State**

- [ ] Create `EmptyState.astro` component
- [ ] Implement new user vs cleared list variants
- [ ] Add "Add All Recommended" quick action
- [ ] Style with existing design system

**2.2 Animations & Feedback**

- [ ] Add fade-out animation for removed parks
- [ ] Add fade-in animation for added parks
- [ ] Add subtle press/tap feedback
- [ ] Toast notifications for success/error

**2.3 Mobile Optimization**

- [ ] Verify 44px+ tap targets
- [ ] Test touch scrolling
- [ ] Optimize for thumb reach (actions at bottom)
- [ ] Test on actual mobile device

**2.4 Edge Cases**

- [ ] Prevent removing last park (minimum 1 required)
- [ ] Handle network errors gracefully
- [ ] Handle concurrent modifications
- [ ] Prevent double-tap issues

#### Acceptance Criteria (M2)

- [ ] Empty state clearly guides users
- [ ] All animations are smooth (60fps)
- [ ] All tap targets >= 44px
- [ ] Error states are user-friendly
- [ ] Works well on mobile devices

---

### Milestone 3: Integration Polish (1-2 hours)

**Goal:** Seamless integration with existing pick flow

#### Tasks

**3.1 Error Handling in pickPark**

- [ ] Improve error message when list is empty
- [ ] Add link to `/manage` in error state
- [ ] Test empty list scenario

**3.2 Stats Page Integration**

- [ ] Verify stats page shows user's parks only
- [ ] Add "Manage" link from stats
- [ ] Ensure visit counts display correctly

**3.3 Home Page Updates**

- [ ] Show park count badge
- [ ] Add quick link to manage parks
- [ ] Update empty state messaging

**3.4 Final Testing**

- [ ] End-to-end flow: sign in -> add parks -> pick park
- [ ] Test remove park -> pick still works
- [ ] Verify no-repeat-in-5 logic with custom list
- [ ] Cross-browser testing

#### Acceptance Criteria (M3)

- [ ] Pick flow works seamlessly with managed list
- [ ] Error messages include actionable next steps
- [ ] Stats accurately reflect user's parks
- [ ] Full user journey is polished

---

## Technical Specifications

### API Endpoints Summary

| Endpoint        | Method | Authentication | Purpose                            |
| --------------- | ------ | -------------- | ---------------------------------- |
| `/api/query`    | POST   | Required       | `parks:getAvailableParks`          |
| `/api/query`    | POST   | Required       | `userParks:listUserParks`          |
| `/api/mutation` | POST   | Required       | `userParks:addParkToUserList`      |
| `/api/mutation` | POST   | Required       | `userParks:removeParkFromUserList` |

### Error Handling Strategy

**Client-Side:**

```typescript
try {
  const result = await removeParkFromList(token, parkId);
  if (result.removed) {
    // Animate card removal
    // Show success toast
  } else {
    // Show warning toast (e.g., "Already removed")
  }
} catch (error) {
  // Show error toast
  // Log to console for debugging
  // Don't crash the page
}
```

**Backend:**

- All mutations throw descriptive errors
- Queries return empty arrays (not errors) for edge cases
- Authentication errors return 401 via Convex

### Performance Considerations

1. **Server-Side Rendering:** Fetch initial data in Astro frontmatter
2. **Optimistic Updates:** Update UI before mutation completes
3. **Lazy Loading:** Only load available parks when section expanded
4. **Caching:** Convex handles query caching automatically

### Security Considerations

1. **Authentication Required:** All mutations require valid Clerk token
2. **User Isolation:** Queries filter by authenticated user's ID
3. **No Direct ID Exposure:** Use Convex document IDs (not sequential)
4. **Rate Limiting:** Convex has built-in rate limiting

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

| Requirement         | Implementation                                   |
| ------------------- | ------------------------------------------------ |
| Color contrast      | 4.5:1 minimum for text                           |
| Focus indicators    | Visible focus rings on all interactive elements  |
| Touch targets       | 44x44px minimum                                  |
| Screen reader       | ARIA labels on buttons, live regions for updates |
| Keyboard navigation | Tab order, Enter/Space to activate               |
| Motion              | Respect `prefers-reduced-motion`                 |

### ARIA Implementation

```html
<!-- Park card with remove button -->
<article class="park-card" aria-label="Arlington Park">
  <h3>Arlington Park</h3>
  <button aria-label="Remove Arlington Park from your list" class="remove-btn">
    <span aria-hidden="true">🗑</span>
  </button>
</article>

<!-- Live region for updates -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status-announcer">
  <!-- JS updates this with "Park added" / "Park removed" -->
</div>
```

---

## Testing Requirements

### Unit Tests (Convex Functions)

```typescript
// convex/parks.test.ts
describe("getAvailableParks", () => {
  it("returns all parks for unauthenticated user", async () => {
    // Test implementation
  });

  it("excludes user's parks from results", async () => {
    // Test implementation
  });

  it("returns empty array when user has all parks", async () => {
    // Test implementation
  });
});
```

### Integration Tests

| Test Case             | Steps                                                        | Expected Result                     |
| --------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Add park              | 1. Sign in, 2. Open /manage, 3. Expand available, 4. Tap add | Park appears in My Parks            |
| Remove park           | 1. Sign in, 2. Open /manage, 3. Tap remove, 4. Confirm       | Park disappears, shows in Available |
| Empty state           | 1. Sign in (new user), 2. Open /manage                       | Empty state displayed               |
| Pick with custom list | 1. Remove some parks, 2. Pick a park                         | Only remaining parks selected       |

### Manual Testing Checklist

- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test on desktop Chrome/Firefox/Safari
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Test keyboard-only navigation
- [ ] Test with slow network (3G throttle)
- [ ] Test offline behavior

---

## Deployment Notes

### Environment Variables (Already Configured)

- `CONVEX_URL` - Convex deployment URL
- `GOOGLE_MAPS_API_KEY` - For photo URLs (existing)
- Clerk keys (existing)

### Deployment Steps

1. Deploy Convex functions: `npx convex deploy`
2. Build Astro site: `bun build`
3. Deploy static files to hosting (Vercel/Cloudflare)

### Rollback Plan

- Convex supports instant rollback via dashboard
- Static site can revert via git

---

## Appendix A: Complete File Changes Summary

### New Files

| File                                     | Purpose                      |
| ---------------------------------------- | ---------------------------- |
| `/src/pages/manage.astro`                | Park management page         |
| `/src/components/parks/ParkCard.astro`   | Reusable park card component |
| `/src/components/parks/EmptyState.astro` | Empty list messaging         |

### Modified Files

| File                       | Changes                       |
| -------------------------- | ----------------------------- |
| `/convex/parks.ts`         | Add `getAvailableParks` query |
| `/src/lib/convexClient.ts` | Add 4 new helper functions    |
| `/src/pages/index.astro`   | Add "Manage Parks" link       |
| `/src/pages/stats.astro`   | Add "Manage Parks" link       |

### No Changes Required

- `/convex/schema.ts` - Schema is complete
- `/convex/userParks.ts` - All mutations exist
- `/convex/users.ts` - User management complete
- `/convex/actions/pickPark.ts` - Already uses user's list

---

## Appendix B: Design System Reference

### Colors (from existing global.css)

```css
--cream: #f8f5e6; /* Card backgrounds */
--forest: #2d4a3e; /* Primary text */
--moss: #5a7c6f; /* Secondary text */
--gold: #d4a84b; /* Accents, links */
--sunset: #c17a4a; /* Action highlights */
--sage: #8fa89a; /* Muted elements */
--mist: #e8e4d9; /* Borders, dividers */
```

### Typography

- **Headings:** Fraunces (serif)
- **Body:** Source Sans 3 (sans-serif)
- **Sizes:** Use Tailwind's scale (text-sm, text-base, text-lg, etc.)

### Button Variants (from Starwind)

- `primary` - Gold/sunset for primary actions
- `outline` - For secondary actions
- `ghost` - For inline/subtle actions
- `error` - For destructive actions (remove)

---

## Appendix C: Client-Side Script Template

```javascript
// manage.astro inline script

// State
let userParks = window.__USER_PARKS__ || [];
let availableParks = window.__AVAILABLE_PARKS__ || [];

// DOM refs
const myParksGrid = document.getElementById("my-parks-grid");
const availableGrid = document.getElementById("available-parks-grid");
const statusAnnouncer = document.getElementById("status-announcer");

// Add park handler
async function handleAddPark(parkId) {
  const button = document.querySelector(`[data-add-park="${parkId}"]`);
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span>';

  try {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${convexToken}`,
      },
      body: JSON.stringify({
        path: "userParks:addParkToUserList",
        args: { parkId },
        format: "json",
      }),
    });

    const result = await response.json();

    if (result.value?.added) {
      // Move park from available to my parks
      const park = availableParks.find((p) => p._id === parkId);
      if (park) {
        // Update UI
        moveParkToMyList(park);
        // Announce for screen readers
        announce(`${park.name} added to your list`);
      }
    }
  } catch (error) {
    console.error("Failed to add park:", error);
    announce("Failed to add park. Please try again.");
  } finally {
    button.disabled = false;
    button.innerHTML = "+";
  }
}

// Remove park handler
async function handleRemovePark(parkId) {
  // Confirm before removing
  if (!confirm("Remove this park from your list?")) return;

  // Check minimum park requirement
  if (userParks.length <= 1) {
    alert("You must have at least one park in your list.");
    return;
  }

  const card = document.querySelector(`[data-park-id="${parkId}"]`);
  card.classList.add("removing");

  try {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${convexToken}`,
      },
      body: JSON.stringify({
        path: "userParks:removeParkFromUserList",
        args: { parkId },
        format: "json",
      }),
    });

    const result = await response.json();

    if (result.value?.removed) {
      // Animate removal
      card.addEventListener("transitionend", () => {
        card.remove();
        // Move to available parks
        moveParkToAvailable(parkId);
      });

      announce("Park removed from your list");
    }
  } catch (error) {
    console.error("Failed to remove park:", error);
    card.classList.remove("removing");
    announce("Failed to remove park. Please try again.");
  }
}

// Screen reader announcements
function announce(message) {
  statusAnnouncer.textContent = message;
}

// Toggle available parks section
document.getElementById("toggle-available")?.addEventListener("click", (e) => {
  const section = document.getElementById("available-section");
  const isExpanded = section.classList.toggle("expanded");
  e.target.setAttribute("aria-expanded", isExpanded);
});
```

---

_End of PRD Document_
