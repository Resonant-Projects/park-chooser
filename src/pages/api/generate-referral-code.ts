import type { APIRoute } from "astro";
import { getOrCreateMyReferralCode } from "../../lib/convexClient";

export const POST: APIRoute = async ({ locals }) => {
	const { userId, getToken } = locals.auth();

	if (!userId) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const token = await getToken({ template: "convex" });
		if (!token) {
			return new Response(JSON.stringify({ error: "Failed to get auth token" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		const referralCode = await getOrCreateMyReferralCode(token);

		return new Response(JSON.stringify({ code: referralCode.code }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to generate referral code:", error);
		return new Response(JSON.stringify({ error: "Failed to generate referral code" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
