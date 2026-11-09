import { Webhook } from "svix";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateClerkWebhook } from "./svixWebhook";

// Throwaway test-only signing secret (base64 of "park-chooser-test-secret").
const SECRET = `whsec_${btoa("park-chooser-test-secret")}`;
const EVENT = { type: "user.created", data: { id: "user_123" } };

function signedRequest(body: string, overrides: Record<string, string> = {}) {
	const id = "msg_test_1";
	const timestamp = new Date();
	const signature = new Webhook(SECRET).sign(id, timestamp, body);
	return new Request("https://example.invalid/webhooks/clerk-billing", {
		method: "POST",
		body,
		headers: {
			"svix-id": id,
			"svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
			"svix-signature": signature,
			...overrides,
		},
	});
}

describe("validateClerkWebhook", () => {
	afterEach(() => vi.restoreAllMocks());

	it("returns the parsed event for a correctly signed payload", async () => {
		const result = await validateClerkWebhook(signedRequest(JSON.stringify(EVENT)), SECRET);
		expect(result).toEqual({ success: true, event: EVENT });
	});

	it("rejects a payload whose signature does not match", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const request = signedRequest(JSON.stringify(EVENT), {
			"svix-signature": "v1,aW52YWxpZC1zaWduYXR1cmU=",
		});
		expect(await validateClerkWebhook(request, SECRET)).toEqual({
			success: false,
			error: "Invalid webhook signature",
		});
	});

	it("rejects a payload signed with a different secret", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const other = `whsec_${btoa("some-other-secret")}`;
		const result = await validateClerkWebhook(signedRequest(JSON.stringify(EVENT)), other);
		expect(result).toEqual({ success: false, error: "Invalid webhook signature" });
	});

	it("rejects requests without Svix headers", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const request = new Request("https://example.invalid/", { method: "POST", body: "{}" });
		expect(await validateClerkWebhook(request, SECRET)).toEqual({
			success: false,
			error: "Missing Svix headers",
		});
	});

	it("fails with 500 when the webhook secret is not configured", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const result = await validateClerkWebhook(signedRequest(JSON.stringify(EVENT)), undefined);
		expect(result).toEqual({
			success: false,
			error: "Webhook secret not configured",
			statusCode: 500,
		});
	});

	it("rejects a correctly signed payload that is not a Clerk event", async () => {
		const result = await validateClerkWebhook(signedRequest('{"hello":"world"}'), SECRET);
		expect(result).toEqual({ success: false, error: "Invalid webhook payload" });
	});
});
