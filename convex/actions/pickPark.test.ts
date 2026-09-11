import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { pickPark } from "./pickPark";

it("preserves the empty-list message for production clients without recording a pick", async () => {
	const runQuery = vi.fn(async (reference) => {
		switch (getFunctionName(reference)) {
			case getFunctionName(internal.users.getCurrentUserInternal):
				return { _id: "user-empty" };
			case getFunctionName(internal.entitlements.checkCanPickToday):
				return { canPick: true };
			case getFunctionName(internal.userParks.getUserParksWithDetails):
				return [];
			default:
				throw new Error("Unexpected query after finding an empty park list");
		}
	});
	const runMutation = vi.fn();
	const ctx = { runQuery, runMutation } as unknown as ActionCtx;
	const action = pickPark as typeof pickPark & {
		_handler: (ctx: ActionCtx, args: Record<string, never>) => Promise<unknown>;
	};

	const error = await action._handler(ctx, {}).catch((err: unknown) => err);
	// Convex redacts ordinary Error messages in production. Only ConvexError data
	// reaches the client, where the picker checks for the NO_PARKS code.
	expect(error).toBeInstanceOf(ConvexError);
	expect((error as ConvexError<string>).data).toBe(
		"NO_PARKS: Add parks to your list first. Visit the Manage page to get started."
	);
	expect(runMutation).not.toHaveBeenCalled();
});
