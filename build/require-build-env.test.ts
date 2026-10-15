import { describe, expect, it } from "vitest";
import { assertBuildEnv, findBuildEnvProblems } from "./require-build-env";

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
});
