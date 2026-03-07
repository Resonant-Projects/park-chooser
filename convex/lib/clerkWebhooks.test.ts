import { describe, expect, it } from "vitest";
import {
	normalizeSubscriptionEntitlement,
	normalizeSubscriptionItemEntitlement,
} from "./clerkWebhooks";

describe("normalizeSubscriptionItemEntitlement", () => {
	it("converts nullable billing fields to undefined", () => {
		expect(
			normalizeSubscriptionItemEntitlement({
				id: "si_123",
				subscription_id: "sub_123",
				plan_id: null,
				plan: { slug: null },
				status: "active",
				current_period_start: null,
				current_period_end: null,
				is_free_trial: null,
			})
		).toEqual({
			clerkSubscriptionId: "sub_123",
			clerkSubscriptionItemId: "si_123",
			status: "active",
			clerkPlanId: undefined,
			clerkPlanSlug: undefined,
			periodStart: undefined,
			periodEnd: undefined,
			isFreeTrial: undefined,
		});
	});

	it("maps populated string periods into timestamps", () => {
		expect(
			normalizeSubscriptionItemEntitlement(
				{
					id: "si_456",
					subscription_id: "sub_456",
					plan_id: "plan_monthly",
					plan: { slug: "monthly" },
					status: "active",
					current_period_start: "2026-03-07T00:00:00.000Z",
					current_period_end: "2026-04-07T00:00:00.000Z",
					is_free_trial: false,
				},
				"canceled"
			)
		).toEqual({
			clerkSubscriptionId: "sub_456",
			clerkSubscriptionItemId: "si_456",
			clerkPlanId: "plan_monthly",
			clerkPlanSlug: "monthly",
			status: "canceled",
			periodStart: Date.parse("2026-03-07T00:00:00.000Z"),
			periodEnd: Date.parse("2026-04-07T00:00:00.000Z"),
			isFreeTrial: false,
		});
	});
});

describe("normalizeSubscriptionEntitlement", () => {
	it("converts nullable subscription fields to undefined", () => {
		expect(
			normalizeSubscriptionEntitlement(
				"sub_789",
				{
					id: "item_789",
					plan_id: null,
					plan: { slug: null },
					status: "active",
					period_start: null,
					period_end: null,
					is_free_trial: null,
				},
				"past_due"
			)
		).toEqual({
			clerkSubscriptionId: "sub_789",
			clerkSubscriptionItemId: "item_789",
			clerkPlanId: undefined,
			clerkPlanSlug: undefined,
			status: "past_due",
			periodStart: undefined,
			periodEnd: undefined,
			isFreeTrial: undefined,
		});
	});

	it("passes through numeric period fields when present", () => {
		expect(
			normalizeSubscriptionEntitlement("sub_101", {
				id: "item_101",
				plan_id: "plan_premium",
				plan: { slug: "premium" },
				status: "active",
				period_start: 1772841600000,
				period_end: 1775433600000,
				is_free_trial: true,
			})
		).toEqual({
			clerkSubscriptionId: "sub_101",
			clerkSubscriptionItemId: "item_101",
			clerkPlanId: "plan_premium",
			clerkPlanSlug: "premium",
			status: "active",
			periodStart: 1772841600000,
			periodEnd: 1775433600000,
			isFreeTrial: true,
		});
	});
});
