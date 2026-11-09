// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route } from "./_authenticated";

const mocks = vi.hoisted(() => ({
	auth: { isLoaded: false, isSignedIn: undefined as boolean | undefined },
	navigate: vi.fn(),
	storeUser: vi.fn(),
	userButtonProps: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
	useAuth: () => mocks.auth,
	UserButton: (props: Record<string, unknown>) => {
		mocks.userButtonProps(props);
		return <div data-testid="user-button" />;
	},
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => ({ options }),
	Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
	Outlet: () => <div data-testid="protected-outlet" />,
	useNavigate: () => mocks.navigate,
}));

vi.mock("convex/react", () => ({
	useMutation: () => mocks.storeUser,
}));

const AuthenticatedLayout = Route.options.component as ComponentType;

beforeEach(() => {
	mocks.storeUser.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

it("shows only a spinner while Clerk is loading", () => {
	mocks.auth = { isLoaded: false, isSignedIn: undefined };
	const { container } = render(<AuthenticatedLayout />);

	expect(container.querySelector(".spinner")).not.toBeNull();
	expect(screen.queryByTestId("protected-outlet")).toBeNull();
	expect(mocks.navigate).not.toHaveBeenCalled();
	expect(mocks.storeUser).not.toHaveBeenCalled();
});

it("redirects signed-out users to /sign-in without rendering protected content", () => {
	mocks.auth = { isLoaded: true, isSignedIn: false };
	const { container } = render(<AuthenticatedLayout />);

	expect(mocks.navigate).toHaveBeenCalledWith({ to: "/sign-in" });
	expect(container.innerHTML).toBe("");
	expect(mocks.storeUser).not.toHaveBeenCalled();
});

it("renders protected content for signed-in users after bootstrapping the Convex user", async () => {
	mocks.auth = { isLoaded: true, isSignedIn: true };
	render(<AuthenticatedLayout />);

	await waitFor(() => expect(screen.queryByTestId("protected-outlet")).not.toBeNull());
	expect(mocks.storeUser).toHaveBeenCalledTimes(1);
	expect(mocks.navigate).not.toHaveBeenCalled();
	// Clerk Core 3 removed UserButton's sign-out redirect props; ClerkProvider owns it.
	expect(mocks.userButtonProps).toHaveBeenCalledWith(
		expect.not.objectContaining({ afterSignOutUrl: expect.anything() })
	);
});
