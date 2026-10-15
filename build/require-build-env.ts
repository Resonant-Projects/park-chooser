import { loadEnv, type Plugin } from "vite";

/**
 * Startup guard for the environment variables the app cannot work without.
 *
 * Sign-in (Clerk) and the backend (Convex) are not optional: a build that is
 * missing either one would ship a site with authentication or data access
 * silently switched off. So a missing/invalid value must fail the build (and
 * the dev server) loudly instead of falling back to a degraded mode.
 *
 * Where the values come from:
 * - `VITE_CLERK_PUBLISHABLE_KEY`: Vercel project env vars (Preview + Production),
 *   or locally a `.env.local` (e.g. from `vercel env pull --environment=development`).
 * - `VITE_CONVEX_URL`: supplied by `convex deploy --cmd 'vite build'` on Vercel
 *   (the check runs inside `vite build`, i.e. after Convex has set it), or a
 *   local `.env.local` written by `bunx convex dev`.
 *
 * This runs for `vite build` and `vite dev`/`vite preview`. Unit tests
 * (vitest.config.ts), typecheck and lint never load this plugin, so they do not
 * need any keys.
 */

type EnvSource = Record<string, string | undefined>;

interface Requirement {
	name: string;
	hint: string;
	validate: (value: string) => string | null;
}

const REQUIREMENTS: Requirement[] = [
	{
		name: "VITE_CLERK_PUBLISHABLE_KEY",
		hint: "Clerk dashboard > API keys. Set it in the Vercel project's env vars for Preview and Production (or in .env.local locally: `vercel env pull --environment=development`, keep only the VITE_ vars).",
		validate: (value) =>
			isClerkPublishableKey(value)
				? null
				: 'must be a Clerk publishable key ("pk_test_" or "pk_live_" followed by the encoded frontend API)',
	},
	{
		name: "VITE_CONVEX_URL",
		hint: "On Vercel the build command must be `convex deploy --cmd 'vite build'` so Convex supplies it. Locally, run `bunx convex dev` (writes .env.local).",
		validate: (value) => {
			try {
				new URL(value);
			} catch {
				return "must be a valid URL";
			}
			// Mirrors convex's validateDeploymentUrl + ConvexReactClient, which check the
			// raw string: it must start with "http:"/"https:" and contain "://" (so
			// "https:host" is rejected), and must not be the .convex.site HTTP Actions URL.
			if (!/^https?:\/\//.test(value)) return 'must start with "https://" or "http://"';
			return value.endsWith(".convex.site")
				? "must be the deployment URL (.convex.cloud), not the .convex.site HTTP Actions URL"
				: null;
		},
	},
];

/**
 * Mirrors @clerk/shared's isPublishableKey: "pk_test_"/"pk_live_" plus a base64
 * payload that decodes to "<frontend api host>$" (one trailing "$", a dot in the host).
 */
function isClerkPublishableKey(value: string): boolean {
	const [prefix, instance, payload, ...rest] = value.split("_");
	if (
		prefix !== "pk" ||
		(instance !== "test" && instance !== "live") ||
		!payload ||
		rest.length
	) {
		return false;
	}
	let decoded: string;
	try {
		decoded = atob(payload);
	} catch {
		return false;
	}
	if (!decoded.endsWith("$")) return false;
	const host = decoded.slice(0, -1);
	return !host.includes("$") && host.includes(".");
}

/** Returns one human-readable problem per missing/invalid variable. Values are never echoed. */
export function findBuildEnvProblems(env: EnvSource): string[] {
	const problems: string[] = [];
	for (const { name, hint, validate } of REQUIREMENTS) {
		const value = env[name];
		if (!value?.trim()) {
			problems.push(`${name} is missing or empty. ${hint}`);
			continue;
		}
		// Vite inlines the raw value, so validate exactly what the app will receive.
		const invalid =
			value === value.trim()
				? validate(value)
				: "must not have leading or trailing whitespace";
		if (invalid) {
			problems.push(`${name} is invalid: ${invalid}. ${hint}`);
		}
	}
	return problems;
}

export function assertBuildEnv(env: EnvSource): void {
	const problems = findBuildEnvProblems(env);
	if (problems.length === 0) return;
	throw new Error(
		[
			"Build aborted: required environment variables are not configured.",
			"Refusing to build a site with sign-in or the backend disabled.",
			"",
			...problems.map((problem) => `  - ${problem}`),
			"",
		].join("\n")
	);
}

/** Vite plugin: fails `vite build` and `vite dev` (never tests) when required env vars are missing. */
export function requireBuildEnv(): Plugin {
	return {
		name: "park-chooser:require-build-env",
		config(config, { mode }) {
			// loadEnv merges `.env*` files with process.env (process.env wins), which is
			// the same precedence Vite uses when it inlines import.meta.env.VITE_*.
			assertBuildEnv(loadEnv(mode, config.root ?? process.cwd(), "VITE_"));
		},
	};
}
