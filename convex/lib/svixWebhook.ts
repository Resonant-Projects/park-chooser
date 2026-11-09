import { Webhook } from "svix";

export interface ClerkWebhookEvent {
	type: string;
	data: unknown;
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

	try {
		new Webhook(webhookSecret).verify(payloadString, {
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
		return { success: false, error: "Invalid webhook payload" };
	}
	if (!isClerkWebhookEvent(event)) {
		return { success: false, error: "Invalid webhook payload" };
	}
	return { success: true, event };
}

function isClerkWebhookEvent(value: unknown): value is ClerkWebhookEvent {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string" &&
		"data" in value
	);
}
