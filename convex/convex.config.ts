import { defineApp } from "convex/server";
import { v } from "convex/values";

/**
 * Environment variables the Convex functions read, exposed as the typed `env`
 * object from `_generated/server`. Required variables are validated by
 * `convex deploy`, so a deployment that lacks one fails to deploy.
 */
const app = defineApp({
	env: {
		// Clerk issuer for JWT validation (auth.config.ts). Without it no user can sign in.
		CLERK_JWT_ISSUER_DOMAIN: v.string(),
		// Optional: the handlers that use these fail loudly at request time (5xx + error log)
		// when unset, as before. Make them required once every deployment sets them.
		GOOGLE_MAPS_API_KEY: v.optional(v.string()),
		CLERK_WEBHOOK_SECRET: v.optional(v.string()),
	},
});

export default app;
