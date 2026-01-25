import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { Car, ExternalLink, Loader2, MapPin, MapPinOff, Shuffle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useEntitlement } from "../../hooks/useEntitlement";
import { useLocation } from "../../hooks/useLocation";

export const Route = createFileRoute("/_authenticated/app")({
	component: AppPage,
});

function AppPage() {
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLimitExceeded, setIsLimitExceeded] = useState(false);
	const [currentSlide, setCurrentSlide] = useState(0);
	const carouselRef = useRef<HTMLDivElement>(null);

	// Travel time state
	const [travelTime, setTravelTime] = useState<{
		durationText: string;
		distanceText: string;
	} | null>(null);
	const [isTravelTimeLoading, setIsTravelTimeLoading] = useState(false);

	// Location hook
	const { location, requestLocation } = useLocation();

	// Entitlement hook for premium status and limits
	const { isPremium, status, periodEnd, isFreeTrial } = useEntitlement();

	// Format expiry date for canceled-but-still-active users
	const expiryMessage =
		status === "canceled" && periodEnd && isPremium
			? `${isFreeTrial ? "Trial" : "Premium"} ends ${new Date(periodEnd).toLocaleDateString()}`
			: null;

	// Get today's pick
	const getTodaysPick = useAction(api.actions.getTodaysPick.getTodaysPick);
	const pickPark = useAction(api.actions.pickPark.pickPark);
	const trackVisit = useAction(api.actions.trackVisit.trackVisit);
	const calculateTravelTime = useAction(api.actions.getTravelTime.calculateTravelTime);

	const [todaysPick, setTodaysPick] = useState<{
		_id: string;
		name: string;
		customName?: string;
		address?: string;
		photoUrl?: string;
		photoUrls?: string[];
		placeId: string;
		chosenAt?: number;
	} | null>(null);

	const [hasLoadedPick, setHasLoadedPick] = useState(false);
	const [loadPickError, setLoadPickError] = useState<string | null>(null);

	// Load today's pick on mount
	const loadTodaysPick = useCallback(() => {
		setLoadPickError(null);
		getTodaysPick()
			.then((pick) => {
				if (pick) {
					setTodaysPick(pick);
				}
			})
			.catch((err) => {
				const message = err instanceof Error ? err.message : "Failed to load today's pick";
				setLoadPickError(message);
			});
	}, [getTodaysPick]);

	useEffect(() => {
		if (!hasLoadedPick) {
			setHasLoadedPick(true);
			loadTodaysPick();
		}
	}, [hasLoadedPick, loadTodaysPick]);

	// Request location on mount
	useEffect(() => {
		requestLocation();
	}, [requestLocation]);

	// Fetch travel time when we have both location and a picked park
	useEffect(() => {
		if (location && todaysPick?.placeId) {
			setIsTravelTimeLoading(true);
			calculateTravelTime({
				originLat: location.lat,
				originLng: location.lng,
				placeId: todaysPick.placeId,
			})
				.then((result) => {
					setTravelTime(result);
				})
				.catch(console.error)
				.finally(() => {
					setIsTravelTimeLoading(false);
				});
		} else {
			setTravelTime(null);
		}
	}, [location, todaysPick?.placeId, calculateTravelTime]);

	// Handle carousel scroll to sync dots
	const handleCarouselScroll = useCallback(() => {
		if (!carouselRef.current) return;
		const scrollLeft = carouselRef.current.scrollLeft;
		const slideWidth = carouselRef.current.offsetWidth;
		const newSlide = Math.round(scrollLeft / slideWidth);
		setCurrentSlide(newSlide);
	}, []);

	// Scroll to specific slide when dot is clicked
	const scrollToSlide = useCallback((index: number) => {
		if (!carouselRef.current) return;
		const slideWidth = carouselRef.current.offsetWidth;
		carouselRef.current.scrollTo({
			left: slideWidth * index,
			behavior: "smooth",
		});
	}, []);

	const handlePickPark = async () => {
		setIsLoading(true);
		setError(null);
		setIsLimitExceeded(false);
		setCurrentSlide(0);

		try {
			const result = await pickPark();
			setTodaysPick({
				...result,
				chosenAt: Date.now(),
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to pick a park";

			// Check for entitlement errors
			if (message.includes("DAILY_PICK_LIMIT_EXCEEDED")) {
				setError("You've used your daily pick! Upgrade to Premium for unlimited picks.");
				setIsLimitExceeded(true);
			} else if (message.includes("NO_PARKS")) {
				setError(
					"Add some parks to your list first! Visit the Manage page to get started."
				);
			} else {
				setError(message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpgrade = () => {
		navigate({ to: "/pricing" });
	};

	const handleVisitPark = async () => {
		if (!todaysPick) return;

		// Track the visit
		try {
			await trackVisit({ parkId: todaysPick._id as Id<"parks"> });
		} catch (err) {
			console.error("Failed to track visit:", err);
		}

		// Open in Google Maps
		const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${todaysPick.placeId}`;
		window.open(mapsUrl, "_blank");
	};

	const photos = todaysPick?.photoUrls || (todaysPick?.photoUrl ? [todaysPick.photoUrl] : []);
	const hasMultiplePhotos = photos.length > 1;

	return (
		<main className="flex-1 flex flex-col items-center justify-center gap-6">
			{expiryMessage && (
				<div className="glass-card max-w-md w-full text-center py-2 px-4">
					<p className="text-sm text-[var(--color-mist)]">{expiryMessage}</p>
				</div>
			)}

			{(error || loadPickError) && (
				<div className="limit-banner max-w-md w-full">
					<p className="text-[var(--color-cream)]">{error || loadPickError}</p>
					{loadPickError && (
						<button
							type="button"
							onClick={loadTodaysPick}
							className="btn btn-secondary mt-2"
							style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
						>
							Try Again
						</button>
					)}
				</div>
			)}

			{todaysPick ? (
				<div className="park-card-main animate-card-appear max-w-md w-full">
					{/* Photo Carousel */}
					{photos.length > 0 && (
						<div
							className={`carousel-container ${!hasMultiplePhotos ? "single-photo" : ""}`}
						>
							<div
								ref={carouselRef}
								className="carousel-slides"
								onScroll={handleCarouselScroll}
							>
								{photos.map((url, i) => (
									<div key={i} className="carousel-slide">
										<img
											src={url}
											alt={`${todaysPick.name} - view ${i + 1}`}
											className="w-full h-full object-cover"
										/>
									</div>
								))}
							</div>

							{/* Dot Indicators */}
							{hasMultiplePhotos && (
								<div className="carousel-dots">
									{photos.map((_, i) => (
										<button
											type="button"
											key={i}
											className={`carousel-dot ${currentSlide === i ? "active" : ""}`}
											onClick={() => scrollToSlide(i)}
											aria-label={`Go to photo ${i + 1}`}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{/* Park Info - White Card Section */}
					<div className="park-info-card">
						<h2 className="text-2xl font-semibold mb-1">
							{todaysPick.customName || todaysPick.name}
						</h2>
						{todaysPick.address && (
							<p className="text-sm mb-4 flex items-center gap-1">
								<MapPin className="w-4 h-4" />
								{todaysPick.address}
							</p>
						)}

						<div className="flex items-center justify-between gap-4">
							<button type="button" onClick={handleVisitPark} className="maps-link">
								Open in Google Maps
								<ExternalLink className="w-4 h-4" />
							</button>

							{/* Travel Time Badge */}
							{isTravelTimeLoading ? (
								<div className="travel-badge loading">
									<Loader2 className="w-4 h-4 animate-spin" />
									<span>Loading...</span>
								</div>
							) : travelTime ? (
								<div className="travel-badge">
									<Car className="w-4 h-4" />
									<span>
										{travelTime.durationText} • {travelTime.distanceText}
									</span>
								</div>
							) : (
								<button
									type="button"
									onClick={() => requestLocation(true)}
									className="travel-badge disabled"
								>
									<MapPinOff className="w-4 h-4" />
									<span>Location off</span>
								</button>
							)}
						</div>
					</div>
				</div>
			) : (
				/* Initial State - Pre-Pick */
				<div className="glass-card initial-state-card max-w-md w-full animate-card-appear">
					<div className="icon">
						<span role="img" aria-label="Tree">
							🌲
						</span>
					</div>
					<h2>Ready for a Park Adventure?</h2>
					<p>Click below to randomly pick your next park destination!</p>
					<div className="arrow">↓</div>
				</div>
			)}

			{isLimitExceeded ? (
				<button type="button" onClick={handleUpgrade} className="btn btn-primary btn-lg">
					<Sparkles className="w-6 h-6" />
					Upgrade Now
				</button>
			) : (
				<button
					type="button"
					onClick={handlePickPark}
					disabled={isLoading}
					className={`btn btn-primary btn-lg ${isLoading ? "button-loading" : ""}`}
				>
					{isLoading ? (
						<>
							<Loader2 className="w-6 h-6 animate-spin" />
							Picking...
						</>
					) : (
						<>
							<Shuffle className="w-6 h-6" />
							{todaysPick ? "Pick Again" : "Pick a Park"}
						</>
					)}
				</button>
			)}
		</main>
	);
}
