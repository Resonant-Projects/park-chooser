// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ providerProps: vi.fn() }));

vi.mock("@clerk/react", () => ({
	useAuth: vi.fn(),
	ClerkProvider: ({ children, ...props }: { children: ReactNode }) => {
		mocks.providerProps(props);
		return <>{children}</>;
	},
}));

// The key is read at module load, so each case imports a fresh module.
async function loadProvider() {
	vi.resetModules();
	return (await import("./provider")).default;
}

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

it("refuses to render the app when the Clerk publishable key is missing", async () => {
	vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "");
	const AppClerkProvider = await loadProvider();
	vi.spyOn(console, "error").mockImplementation(() => {});

	expect(() =>
		render(
			<AppClerkProvider>
				<p>app</p>
			</AppClerkProvider>
		)
	).toThrow("VITE_CLERK_PUBLISHABLE_KEY is not set");
	expect(mocks.providerProps).not.toHaveBeenCalled();
	expect(screen.queryByText("app")).toBeNull();
});

it("wraps the app in ClerkProvider with the key and a global sign-out redirect", async () => {
	const key = "pk_test_Y2xlcmsucGFyay1jaG9vc2VyLWNpLmludmFsaWQk";
	vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", key);
	const AppClerkProvider = await loadProvider();

	render(
		<AppClerkProvider>
			<p>app</p>
		</AppClerkProvider>
	);

	expect(screen.getByText("app")).not.toBeNull();
	expect(mocks.providerProps).toHaveBeenCalledWith({
		publishableKey: key,
		afterSignOutUrl: "/",
	});
});
