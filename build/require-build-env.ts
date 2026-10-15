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
			/^pk_(test|live)_\S+$/.test(value) ? null : 'must start with "pk_test_" or "pk_live_"',
	},
	{
		name: "VITE_CONVEX_URL",
		hint: "On Vercel the build command must be `convex deploy --cmd 'vite build'` so Convex supplies it. Locally, run `bunx convex dev` (writes .env.local).",
		validate: (value) => {
			try {
				const { protocol } = new URL(value);
				return protocol === "https:" || protocol === "http:"
					? null
					: "must be an http(s) URL";
			} catch {
				return "must be a valid URL";
			}
		},
	},
];

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
