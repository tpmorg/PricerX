/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as priceSnapshots from "../priceSnapshots.js";
import type * as pricing from "../pricing.js";
import type * as providers_braveProvider from "../providers/braveProvider.js";
import type * as providers_ebayProvider from "../providers/ebayProvider.js";
import type * as providers_priceChartingProvider from "../providers/priceChartingProvider.js";
import type * as providers_sharedPricing from "../providers/sharedPricing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  priceSnapshots: typeof priceSnapshots;
  pricing: typeof pricing;
  "providers/braveProvider": typeof providers_braveProvider;
  "providers/ebayProvider": typeof providers_ebayProvider;
  "providers/priceChartingProvider": typeof providers_priceChartingProvider;
  "providers/sharedPricing": typeof providers_sharedPricing;
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
