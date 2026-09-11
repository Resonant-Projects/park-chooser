// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import type { ComponentType, ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Route } from "./app";

const mocks = vi.hoisted(() => ({
	pickPark: vi.fn(),
	getTodaysPick: vi.fn().mockResolvedValue(null),
	otherAction: vi.fn(),
	requestLocation: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => ({ options }),
	Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("convex/react", () => ({
	useAction: (reference: Parameters<typeof getFunctionName>[0]) => {
		const name = getFunctionName(reference);
		if (name === "actions/pickPark:pickPark") return mocks.pickPark;
		if (name === "actions/getTodaysPick:getTodaysPick") return mocks.getTodaysPick;
		return mocks.otherAction;
	},
}));

vi.mock("../../hooks/useEntitlement", () => ({
	useEntitlement: () => ({ isSupporter: false }),
}));

vi.mock("../../hooks/useLocation", () => ({
	useLocation: () => ({ location: null, requestLocation: mocks.requestLocation }),
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

it("shows empty-list guidance when production redacts the error message", async () => {
	// Convex's client constructs the Error with the redacted message, then attaches
	// the application's original payload separately as data.
	const error = new ConvexError<string>(
		"[CONVEX A(actions/pickPark:pickPark)] [Request ID: 344f7746cd5cd365] Server Error Called by client"
	);
	error.data = "NO_PARKS: Add parks to your list first. Visit the Manage page to get started.";
	mocks.pickPark.mockRejectedValueOnce(error);
	const AppPage = Route.options.component as ComponentType;
	render(<AppPage />);

	fireEvent.click(screen.getByRole("button", { name: "Pick a Park" }));

	await waitFor(() =>
		expect(
			screen.queryByText(
				"Add some parks to your list first! Visit the Manage page to get started."
			)
		).not.toBeNull()
	);
	expect(screen.queryByText(/Server Error/)).toBeNull();
	expect(
		(screen.getByRole("button", { name: "Pick a Park" }) as HTMLButtonElement).disabled
	).toBe(false);
});
