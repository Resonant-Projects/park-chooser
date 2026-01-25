import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useEntitlement } from "../../hooks/useEntitlement";

export const Route = createFileRoute("/_authenticated/manage")({
	component: ManagePage,
});

function ManagePage() {
	const [searchQuery, setSearchQuery] = useState("");

	// Get user's parks
	const userParks = useQuery(api.userParks.getMyParks);
	const parkCount = useQuery(api.userParks.getUserParkCount);

	// Entitlement for showing limits
	const { isPremium, limits } = useEntitlement();
	const maxParks = limits?.maxParks ?? 5;
	const isAtLimit = !isPremium && parkCount !== undefined && parkCount >= maxParks;

	// Get recommended parks for adding
	const allParks = useQuery(api.parks.list);

	// Mutations
	const addParkMutation = useMutation(api.userParks.addPark);
	const removeParkMutation = useMutation(api.userParks.removePark);

	// Filter parks not in user's list
	const userParkIds = new Set(
		userParks?.map((up: { parkId: string }) => up.parkId) || [],
	);
	const availableParks = allParks?.filter((p) => !userParkIds.has(p._id)) || [];

	// Search filter
	const filteredAvailable = searchQuery
		? availableParks.filter((p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: availableParks;

	const handleAddPark = async (parkId: Id<"parks">) => {
		try {
			await addParkMutation({ parkId });
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to add park";
			alert(message);
		}
	};

	const [removeError, setRemoveError] = useState<string | null>(null);

	const handleRemovePark = async (userParkId: Id<"userParks">) => {
		setRemoveError(null);
		try {
			await removeParkMutation({ userParkId });
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to remove park";
			setRemoveError(message);
		}
	};

	return (
		<main className="flex-1 flex flex-col items-stretch justify-start w-full">
			<div className="mb-6 w-full">
				<h1 className="text-2xl font-semibold text-[var(--color-cream)] mb-2">
					Manage Parks
				</h1>
				<p className="text-[var(--color-mist)]">
					{parkCount !== undefined
						? isPremium
							? `${parkCount} parks in your list`
							: `${parkCount}/${maxParks} parks in your list`
						: "Loading..."}
				</p>
				{isAtLimit && (
					<p className="text-[var(--color-gold)] text-sm mt-1">
						You've reached the free tier limit. <a href="/pricing" className="underline">Upgrade</a> for unlimited parks.
					</p>
				)}
				{removeError && (
					<p className="text-[var(--color-sunset)] text-sm mt-1">
						{removeError}
					</p>
				)}
			</div>

			{/* User's Parks - Full width vertical stack */}
			<section className="mb-8 w-full">
				<h2 className="text-lg font-medium text-[var(--color-cream)] mb-4">
					Your Parks
				</h2>

				{userParks === undefined ? (
					<div className="flex justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-[var(--color-gold)]" />
					</div>
				) : userParks.length === 0 ? (
					<div className="glass-card text-center py-8">
						<p className="text-[var(--color-mist)]">
							No parks yet. Add some from the list below!
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{userParks.map((userPark) => (
							<div key={userPark._id} className="park-list-item">
								<div className="park-content">
									<div className="flex items-start gap-3">
										<MapPin className="w-5 h-5 text-[var(--color-gold)] flex-shrink-0 mt-0.5" />
										<div className="min-w-0 flex-1">
											<p className="text-[var(--color-cream)] font-medium text-lg">
												{userPark.customName || userPark.park?.name}
											</p>
											{userPark.park?.address && (
												<p className="text-[var(--color-mist)] text-sm mt-0.5">
													{userPark.park.address}
												</p>
											)}
											{userPark.visitCount > 0 && (
												<p className="text-[var(--color-sage)] text-sm mt-1">
													{userPark.visitCount} visit
													{userPark.visitCount !== 1 ? "s" : ""}
												</p>
											)}
										</div>
									</div>
								</div>
								<div className="park-actions">
									<button
										onClick={() => handleRemovePark(userPark._id)}
										className="btn btn-secondary touch-target"
										title="Remove park"
									>
										<Trash2 className="w-5 h-5" />
										<span>Remove</span>
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* Add Parks - Full width vertical stack */}
			<section className="w-full">
				<h2 className="text-lg font-medium text-[var(--color-cream)] mb-4">
					Add Parks
				</h2>

				{/* Search */}
				<div className="relative mb-4">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--color-mist)] pointer-events-none" />
					<input
						type="search"
						placeholder="Search parks..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full"
						style={{ paddingLeft: "2.5rem" }}
					/>
				</div>

				{filteredAvailable.length === 0 ? (
					<div className="glass-card text-center py-8">
						<p className="text-[var(--color-mist)]">
							{searchQuery
								? "No matching parks found"
								: "All parks have been added to your list!"}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredAvailable.slice(0, 10).map((park) => (
							<div key={park._id} className="park-list-item">
								<div className="park-content">
									<div className="flex items-start gap-3">
										<MapPin className="w-5 h-5 text-[var(--color-sage)] flex-shrink-0 mt-0.5" />
										<div className="min-w-0 flex-1">
											<p className="text-[var(--color-cream)] font-medium text-lg">
												{park.name}
											</p>
											{park.address && (
												<p className="text-[var(--color-mist)] text-sm mt-0.5">
													{park.address}
												</p>
											)}
										</div>
									</div>
								</div>
								<div className="park-actions">
									<button
										onClick={() => handleAddPark(park._id)}
										className="btn btn-primary touch-target"
										title="Add park"
									>
										<Plus className="w-5 h-5" />
										<span>Add</span>
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				<div className="mt-6 text-center">
					<a href="/discover" className="btn btn-secondary">
						Discover nearby parks
					</a>
				</div>
			</section>
		</main>
	);
}
