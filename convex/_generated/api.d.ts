/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_getTravelTime from "../actions/getTravelTime.js";
import type * as actions_pickPark from "../actions/pickPark.js";
import type * as actions_syncParks from "../actions/syncParks.js";
import type * as actions_trackVisit from "../actions/trackVisit.js";
import type * as lib_googleMaps from "../lib/googleMaps.js";
import type * as parks from "../parks.js";
import type * as picks from "../picks.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/getTravelTime": typeof actions_getTravelTime;
  "actions/pickPark": typeof actions_pickPark;
  "actions/syncParks": typeof actions_syncParks;
  "actions/trackVisit": typeof actions_trackVisit;
  "lib/googleMaps": typeof lib_googleMaps;
  parks: typeof parks;
  picks: typeof picks;
  seed: typeof seed;
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
