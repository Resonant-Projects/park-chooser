import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertBuildEnv, findBuildEnvProblems, requireBuildEnv } from "./require-build-env";

const valid = {
	VITE_CLERK_PUBLISHABLE_KEY: "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA",
	VITE_CONVEX_URL: "https://example-123.convex.cloud",
};

describe("require-build-env", () => {
	it("accepts a complete, well-formed environment", () => {
		expect(findBuildEnvProblems(valid)).toEqual([]);
		expect(() => assertBuildEnv(valid)).not.toThrow();
	});

	it("accepts live Clerk keys", () => {
		expect(
			findBuildEnvProblems({ ...valid, VITE_CLERK_PUBLISHABLE_KEY: "pk_live_abc123" })
		).toEqual([]);
	});

	it.each([undefined, "", "   "])("rejects a missing/blank Clerk key (%j)", (value) => {
		const problems = findBuildEnvProblems({ ...valid, VITE_CLERK_PUBLISHABLE_KEY: value });
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("VITE_CLERK_PUBLISHABLE_KEY is missing or empty");
	});

	it("rejects a Clerk secret key or malformed key", () => {
		expect(
			findBuildEnvProblems({ ...valid, VITE_CLERK_PUBLISHABLE_KEY: "sk_test_abc" })[0]
		).toContain("pk_test_");
	});

	it.each([undefined, ""])("rejects a missing Convex URL (%j)", (value) => {
		const problems = findBuildEnvProblems({ ...valid, VITE_CONVEX_URL: value });
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("VITE_CONVEX_URL is missing or empty");
	});

	it("rejects a malformed Convex URL", () => {
		expect(findBuildEnvProblems({ ...valid, VITE_CONVEX_URL: "not a url" })[0]).toContain(
			"must be a valid URL"
		);
	});

	it("reports every problem at once and never echoes values", () => {
		const secret = "sk_test_do_not_leak";
		const error = (() => {
			try {
				assertBuildEnv({ VITE_CLERK_PUBLISHABLE_KEY: secret });
			} catch (e) {
				return e as Error;
			}
			throw new Error("expected assertBuildEnv to throw");
		})();
		expect(error.message).toContain("Build aborted");
		expect(error.message).toContain("VITE_CLERK_PUBLISHABLE_KEY is invalid");
		expect(error.message).toContain("VITE_CONVEX_URL is missing or empty");
		expect(error.message).not.toContain(secret);
	});

	describe("plugin", () => {
		const names = ["VITE_CLERK_PUBLISHABLE_KEY", "VITE_CONVEX_URL"] as const;
		const saved: Partial<Record<(typeof names)[number], string>> = {};
		let root: string;

		beforeEach(() => {
			// loadEnv lets process.env win over .env files; isolate from the host env.
			for (const name of names) {
				saved[name] = process.env[name];
				delete process.env[name];
			}
			root = mkdtempSync(join(tmpdir(), "require-build-env-"));
		});

		afterEach(() => {
			for (const name of names) {
				if (saved[name] === undefined) delete process.env[name];
				else process.env[name] = saved[name];
			}
			rmSync(root, { recursive: true, force: true });
		});

		const runConfigHook = (command: "build" | "serve") => {
			const hook = requireBuildEnv().config as (
				config: { root: string },
				env: { command: "build" | "serve"; mode: string }
			) => void;
			hook({ root }, { command, mode: command === "build" ? "production" : "development" });
		};

		it.each(["build", "serve"] as const)("fails %s when the env is missing", (command) => {
			expect(() => runConfigHook(command)).toThrow("VITE_CLERK_PUBLISHABLE_KEY is missing");
		});

		it.each(["build", "serve"] as const)("passes %s with a complete .env.local", (command) => {
			writeFileSync(
				join(root, ".env.local"),
				`VITE_CLERK_PUBLISHABLE_KEY=${valid.VITE_CLERK_PUBLISHABLE_KEY}\nVITE_CONVEX_URL=${valid.VITE_CONVEX_URL}\n`
			);
			expect(() => runConfigHook(command)).not.toThrow();
		});
	});
});
