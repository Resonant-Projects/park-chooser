/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_backfillEntitlements from "../actions/backfillEntitlements.js";
import type * as actions_getTravelTime from "../actions/getTravelTime.js";
import type * as actions_pickPark from "../actions/pickPark.js";
import type * as actions_searchNearbyParks from "../actions/searchNearbyParks.js";
import type * as actions_seedUser from "../actions/seedUser.js";
import type * as actions_submitFeedback from "../actions/submitFeedback.js";
import type * as actions_submitSupportTicket from "../actions/submitSupportTicket.js";
import type * as actions_syncParks from "../actions/syncParks.js";
import type * as actions_trackVisit from "../actions/trackVisit.js";
import type * as backfillHelpers from "../backfillHelpers.js";
import type * as entitlements from "../entitlements.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_googleMaps from "../lib/googleMaps.js";
import type * as migrations_markRecommendedParks from "../migrations/markRecommendedParks.js";
import type * as migrations_migrateExistingUsers from "../migrations/migrateExistingUsers.js";
import type * as parks from "../parks.js";
import type * as picks from "../picks.js";
import type * as rateLimits from "../rateLimits.js";
import type * as seed from "../seed.js";
import type * as support from "../support.js";
import type * as userParks from "../userParks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/backfillEntitlements": typeof actions_backfillEntitlements;
  "actions/getTravelTime": typeof actions_getTravelTime;
  "actions/pickPark": typeof actions_pickPark;
  "actions/searchNearbyParks": typeof actions_searchNearbyParks;
  "actions/seedUser": typeof actions_seedUser;
  "actions/submitFeedback": typeof actions_submitFeedback;
  "actions/submitSupportTicket": typeof actions_submitSupportTicket;
  "actions/syncParks": typeof actions_syncParks;
  "actions/trackVisit": typeof actions_trackVisit;
  backfillHelpers: typeof backfillHelpers;
  entitlements: typeof entitlements;
  feedback: typeof feedback;
  http: typeof http;
  "lib/entitlements": typeof lib_entitlements;
  "lib/googleMaps": typeof lib_googleMaps;
  "migrations/markRecommendedParks": typeof migrations_markRecommendedParks;
  "migrations/migrateExistingUsers": typeof migrations_migrateExistingUsers;
  parks: typeof parks;
  picks: typeof picks;
  rateLimits: typeof rateLimits;
  seed: typeof seed;
  support: typeof support;
  userParks: typeof userParks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
