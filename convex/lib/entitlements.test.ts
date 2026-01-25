import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectiveTier } from "./entitlements";

describe("getEffectiveTier", () => {
	const now = Date.now();
	const oneDay = 24 * 60 * 60 * 1000;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns premium for active premium subscription", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "active",
				periodEnd: now + oneDay * 30,
			})
		).toBe("premium");
	});

	it("returns premium for canceled subscription with periodEnd in future", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "canceled",
				periodEnd: now + oneDay * 15, // 15 days remaining
			})
		).toBe("premium");
	});

	it("returns free for canceled subscription with periodEnd in past", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "canceled",
				periodEnd: now - oneDay, // Expired yesterday
			})
		).toBe("free");
	});

	it("returns free for canceled subscription without periodEnd", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "canceled",
			})
		).toBe("free");
	});

	it("returns premium for active trial with periodEnd in future", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "active",
				isFreeTrial: true,
				periodEnd: now + oneDay * 7, // 7 day trial
			})
		).toBe("premium");
	});

	it("returns free for canceled trial with periodEnd in past", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "canceled",
				isFreeTrial: true,
				periodEnd: now - oneDay, // Trial expired
			})
		).toBe("free");
	});

	it("returns premium for canceled trial still within trial period", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "canceled",
				isFreeTrial: true,
				periodEnd: now + oneDay * 3, // 3 days left on canceled trial
			})
		).toBe("premium");
	});

	it("returns free for free tier regardless of status", () => {
		expect(
			getEffectiveTier({
				tier: "free",
				status: "active",
			})
		).toBe("free");
	});

	it("returns free for past_due status", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "past_due",
				periodEnd: now + oneDay * 30,
			})
		).toBe("free");
	});

	it("returns free for incomplete status", () => {
		expect(
			getEffectiveTier({
				tier: "premium",
				status: "incomplete",
				periodEnd: now + oneDay * 30,
			})
		).toBe("free");
	});
});
