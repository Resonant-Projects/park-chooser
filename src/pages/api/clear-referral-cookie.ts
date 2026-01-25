import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
	// Delete the referral cookie
	cookies.delete("referral_code", {
		path: "/",
	});

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
