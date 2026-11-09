import { Webhook } from "svix";

export interface ClerkWebhookEvent {
	type: string;
	/** Clerk sends an object for every event type; anything else is rejected. */
	data: object;
}

export type ValidationResult =
	| { success: true; event: ClerkWebhookEvent }
	| { success: false; error: string; statusCode?: number };

/**
 * Verify a Clerk (Svix-signed) webhook and parse its payload.
 *
 * svix 2's `Webhook.verify()` only checks the signature (it throws on failure
 * and returns nothing), so the payload is parsed here after verification.
 */
export async function validateClerkWebhook(
	req: Request,
	webhookSecret: string | undefined
): Promise<ValidationResult> {
	const payloadString = await req.text();

	const svixId = req.headers.get("svix-id");
	const svixTimestamp = req.headers.get("svix-timestamp");
	const svixSignature = req.headers.get("svix-signature");

	if (!svixId || !svixTimestamp || !svixSignature) {
		console.error("Missing Svix headers");
		return { success: false, error: "Missing Svix headers" };
	}

	if (!webhookSecret) {
		console.error("CLERK_WEBHOOK_SECRET not configured");
		return { success: false, error: "Webhook secret not configured", statusCode: 500 };
	}

	// A malformed secret is a server misconfiguration, not a bad request.
	let webhook: Webhook;
	try {
		webhook = new Webhook(webhookSecret);
	} catch (error) {
		console.error("CLERK_WEBHOOK_SECRET is malformed:", error);
		return { success: false, error: "Webhook secret misconfigured", statusCode: 500 };
	}

	try {
		webhook.verify(payloadString, {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
			"svix-signature": svixSignature,
		});
	} catch (error) {
		console.error("Error verifying webhook signature:", error);
		return { success: false, error: "Invalid webhook signature" };
	}

	let event: unknown;
	try {
		event = JSON.parse(payloadString);
	} catch {
		console.error("Signed webhook payload is not valid JSON");
		return { success: false, error: "Invalid webhook payload" };
	}
	if (!isClerkWebhookEvent(event)) {
		console.error(
			"Signed webhook payload is not a Clerk event (needs a string type and object data)"
		);
		return { success: false, error: "Invalid webhook payload" };
	}
	return { success: true, event };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isClerkWebhookEvent(value: unknown): value is ClerkWebhookEvent {
	return isRecord(value) && typeof value.type === "string" && isRecord(value.data);
}
