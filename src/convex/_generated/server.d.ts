/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  QueryBuilder,
  MutationBuilder,
  ActionBuilder,
} from "convex/server";
import type { DataModel } from "./dataModel.d.ts";

export declare const query: QueryBuilder<DataModel, "public">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;
