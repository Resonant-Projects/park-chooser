import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Get the current authenticated user from the database.
 * This is a shared helper to reduce duplication across queries.
 */
export async function getUserFromIdentity(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

/**
 * Get user by ID.
 */
export async function getUserById(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users"> | null> {
  return await ctx.db.get(userId);
}
