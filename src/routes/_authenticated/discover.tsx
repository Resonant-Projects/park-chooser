import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { AlertCircle, Check, Loader2, MapPin, Navigation, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useLocation } from "../../hooks/useLocation";

export const Route = createFileRoute("/_authenticated/discover")({
	component: DiscoverPage,
});

interface NearbyPark {
	_id: string;
	placeId: string;
	name: string;
	address?: string;
	photoRef?: string;
	distanceMiles: number;
	isInUserList: boolean;
	primaryType?: string;
}

/**
 * Build photo URL using the secure proxy endpoint.
 * This avoids exposing the Google API key to the client.
 */
function getPhotoProxyUrl(photoRef: string, maxWidth = 800): string {
	const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
	// Convert .cloud URL to site URL for HTTP endpoints
	const siteUrl = convexUrl.replace(".cloud", ".site");
	return `${siteUrl}/api/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
}

function DiscoverPage() {
	const {
		location,
		error: locationError,
		isLoading: isLoadingLocation,
		requestLocation,
	} = useLocation();
	const [isSearching, setIsSearching] = useState(false);
	const [nearbyParks, setNearbyParks] = useState<NearbyPark[]>([]);
	const [radiusMiles, setRadiusMiles] = useState(5);
	const [addedParkIds, setAddedParkIds] = useState<Set<string>>(new Set());
	const [hideAdded, setHideAdded] = useState(false);

	const searchNearbyParks = useAction(api.actions.searchNearbyParks.searchNearbyParks);
	const addParkMutation = useMutation(api.userParks.addPark);

	const handleSearch = useCallback(async () => {
		if (!location) return;

		setIsSearching(true);

		try {
			const parks = await searchNearbyParks({
				lat: location.lat,
				lng: location.lng,
				radiusMiles,
			});
			setNearbyParks(parks);
			// Reset added parks on new search
			setAddedParkIds(new Set(parks.filter((p) => p.isInUserList).map((p) => p._id)));
		} catch (err) {
			console.error("Failed to search nearby parks:", err);
		} finally {
			setIsSearching(false);
		}
	}, [location, radiusMiles, searchNearbyParks]);

	// Search automatically when location is obtained
	useEffect(() => {
		if (location) {
			handleSearch();
		}
	}, [location, handleSearch]);

	const handleAddPark = async (parkId: string) => {
		try {
			await addParkMutation({ parkId: parkId as Id<"parks"> });
			setAddedParkIds((prev) => new Set([...prev, parkId]));
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to add park";
			alert(message);
		}
	};

	return (
		<main className="flex-1 flex flex-col items-stretch justify-start w-full">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-[var(--color-cream)] mb-2">
					Discover Parks
				</h1>
				<p className="text-[var(--color-mist)]">
					Find parks near you and add them to your list
				</p>
			</div>

			{!location ? (
				<div className="glass-card text-center py-8">
					{locationError ? (
						<>
							<AlertCircle className="w-12 h-12 text-[var(--color-sunset)] mx-auto mb-4" />
							<p className="text-[var(--color-cream)] mb-4">
								{locationError.message}
							</p>
							<button
								type="button"
								onClick={() => requestLocation(true)}
								className="btn btn-primary btn-lg"
							>
								Try Again
							</button>
						</>
					) : (
						<>
							<Navigation className="w-12 h-12 text-[var(--color-gold)] mx-auto mb-4" />
							<p className="text-[var(--color-mist)] mb-4">
								Allow location access to discover parks near you
							</p>
							<button
								type="button"
								onClick={() => requestLocation()}
								disabled={isLoadingLocation}
								className="btn btn-primary btn-lg"
							>
								{isLoadingLocation ? (
									<>
										<Loader2 className="w-6 h-6 animate-spin" />
										Getting Location...
									</>
								) : (
									<>
										<Navigation className="w-6 h-6" />
										Enable Location
									</>
								)}
							</button>
						</>
					)}
				</div>
			) : (
				<>
					{/* Radius Selector - Larger touch targets */}
					<div className="mb-6">
						<span className="text-[var(--color-mist)] block mb-3">Search radius:</span>
						<div className="flex gap-3">
							{[5, 10, 15].map((miles) => (
								<button
									type="button"
									key={miles}
									onClick={() => setRadiusMiles(miles)}
									className={`btn touch-target ${
										radiusMiles === miles ? "btn-primary" : "btn-secondary"
									}`}
								>
									{miles} mi
								</button>
							))}
						</div>
					</div>

					{/* Hide Added Parks Toggle */}
					<label className="flex items-center gap-2 text-[var(--color-mist)] mb-6 cursor-pointer">
						<input
							type="checkbox"
							checked={hideAdded}
							onChange={(e) => setHideAdded(e.target.checked)}
							className="w-5 h-5 rounded border-[var(--color-mist)] bg-transparent accent-[var(--color-gold)]"
						/>
						Hide parks already in my list
					</label>

					{/* Results - Full width vertical cards */}
					{(() => {
						const displayedParks = hideAdded
							? nearbyParks.filter((p) => !addedParkIds.has(p._id))
							: nearbyParks;

						if (isSearching) {
							return (
								<div className="space-y-4">
									{[1, 2, 3].map((i) => (
										<div key={i} className="discover-card animate-pulse">
											{/* Image placeholder */}
											<div className="w-full h-[160px] rounded-xl bg-[rgba(255,255,255,0.08)]" />
											<div className="park-details">
												{/* Title */}
												<div className="h-6 w-3/4 bg-[rgba(255,255,255,0.12)] rounded" />
												{/* Address */}
												<div className="h-4 w-full bg-[rgba(255,255,255,0.08)] rounded" />
												{/* Meta row */}
												<div className="park-meta mt-2">
													<div className="h-5 w-20 bg-[rgba(255,255,255,0.12)] rounded" />
													<div className="h-10 w-24 bg-[rgba(255,255,255,0.15)] rounded-full" />
												</div>
											</div>
										</div>
									))}
								</div>
							);
						}

						if (displayedParks.length === 0) {
							return (
								<div className="glass-card text-center py-8">
									<p className="text-[var(--color-mist)]">
										{nearbyParks.length === 0
											? `No parks found within ${radiusMiles} miles. Try increasing the search radius.`
											: "All nearby parks are already in your list!"}
									</p>
								</div>
							);
						}

						return (
							<div className="space-y-4">
								{displayedParks.map((park) => {
									const isAdded = addedParkIds.has(park._id);

									return (
										<div key={park._id} className="discover-card">
											{park.photoRef && (
												<img
													src={getPhotoProxyUrl(park.photoRef)}
													alt={park.name}
													className="park-image"
												/>
											)}
											<div className="park-details">
												<h3 className="text-[var(--color-cream)] font-medium text-lg">
													{park.name}
												</h3>
												{park.address && (
													<p className="text-[var(--color-mist)] text-sm flex items-start gap-1">
														<MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
														<span>{park.address}</span>
													</p>
												)}
												<div className="park-meta">
													<p className="text-[var(--color-gold)] font-semibold text-base">
														{park.distanceMiles} mi away
													</p>
													<button
														type="button"
														onClick={() => handleAddPark(park._id)}
														disabled={isAdded}
														className={`btn touch-target ${
															isAdded
																? "btn-secondary"
																: "btn-primary"
														}`}
														title={
															isAdded
																? "Already in list"
																: "Add to list"
														}
													>
														{isAdded ? (
															<>
																<Check className="w-5 h-5" />
																Added
															</>
														) : (
															<>
																<Plus className="w-5 h-5" />
																Add
															</>
														)}
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						);
					})()}
				</>
			)}
		</main>
	);
}
