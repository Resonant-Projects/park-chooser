import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { ArrowLeft, Heart, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { FloatingParticles } from "../../components/landing";
import { SEO } from "../../lib/seo/config";

export const Route = createFileRoute("/help/feedback")({
	head: () => ({
		meta: [
			{ title: `Send Feedback - ${SEO.siteName}` },
			{
				name: "description",
				content: `Share your feedback about ${SEO.siteName}. Help us improve!`,
			},
			{ name: "robots", content: "noindex" }, // Auth-required page
		],
	}),
	component: FeedbackPage,
});

function FeedbackPage() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();
	const submitFeedback = useAction(api.actions.submitFeedback.submitFeedback);

	const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState<string>("");

	// Form fields
	const [rating, setRating] = useState(0);
	const [hoveredRating, setHoveredRating] = useState(0);
	const [burstIndex, setBurstIndex] = useState<number | null>(null);
	const [likes, setLikes] = useState("");
	const [improvements, setImprovements] = useState("");
	const [features, setFeatures] = useState("");

	// Redirect if not authenticated
	useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate({ to: "/sign-in", search: { redirect: "/help/feedback" } });
		}
	}, [isLoaded, isSignedIn, navigate]);

	const handleStarClick = (value: number) => {
		setRating(value);
		setBurstIndex(value);
		setTimeout(() => setBurstIndex(null), 400);
	};

	const isValid = rating >= 1 && rating <= 5;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || formState === "loading") return;

		setFormState("loading");
		setErrorMessage("");

		try {
			await submitFeedback({
				rating,
				likesText: likes || undefined,
				improvementsText: improvements || undefined,
				featureRequestsText: features || undefined,
			});

			setFormState("success");
		} catch (err) {
			setErrorMessage(
				err instanceof Error ? err.message : "Something went wrong. Please try again."
			);
			setFormState("error");
		}
	};

	// Show loading while checking auth
	if (!isLoaded) {
		return (
			<div className="landing-container">
				<FloatingParticles />
				<section className="help-hero" style={{ minHeight: "60vh" }}>
					<div className="spinner" />
				</section>
			</div>
		);
	}

	// Don't render if not signed in (will redirect)
	if (!isSignedIn) {
		return null;
	}

	if (formState === "success") {
		return (
			<div className="landing-container">
				<FloatingParticles />

				<section className="help-hero" style={{ minHeight: "50vh" }}>
					<div className="success-state">
						<div className="success-icon success-icon-heart">
							<Heart size={64} fill="currentColor" />
						</div>
						<h1 className="title" style={{ fontSize: "2rem", marginBottom: "1rem" }}>
							<span className="text-gradient">Thank You!</span>
						</h1>
						<p
							style={{
								color: "var(--color-mist)",
								fontSize: "1rem",
								marginBottom: "1.5rem",
								maxWidth: "320px",
							}}
						>
							Your feedback helps us make Pick a Park better for everyone.
						</p>
						<Link to="/app" className="btn btn-primary" style={{ marginTop: "1rem" }}>
							Back to App
						</Link>
					</div>
				</section>

				<footer className="landing-footer">
					<div className="landing-footer-links">
						<Link to="/">Home</Link>
						<Link to="/about">About</Link>
						<Link to="/pricing">Pricing</Link>
						<Link to="/terms">Terms</Link>
						<Link to="/privacy">Privacy</Link>
					</div>
				</footer>
			</div>
		);
	}

	return (
		<div className="landing-container">
			<FloatingParticles />

			{/* Hero Section */}
			<section className="help-hero" style={{ minHeight: "35vh" }}>
				<div className="help-hero-icon">
					<Star size={48} />
				</div>
				<h1 className="title" style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
					<span className="text-gradient">Send Feedback</span>
				</h1>
				<p className="subtitle" style={{ maxWidth: "400px", animationDelay: "0.3s" }}>
					Help us improve Pick a Park
				</p>
			</section>

			{/* Feedback Form */}
			<section className="landing-section">
				<div className="glass-card-accent">
					<form onSubmit={handleSubmit} noValidate>
						{/* Star Rating */}
						<fieldset className="form-field" style={{ border: "none", padding: 0 }}>
							<legend
								className="form-label"
								style={{ textAlign: "center", display: "block", width: "100%" }}
							>
								How would you rate your experience?
							</legend>
							<div className="firefly-rating">
								{[1, 2, 3, 4, 5].map((value) => (
									<button
										key={value}
										type="button"
										className={`firefly-star ${
											value <= (hoveredRating || rating) ? "glow" : ""
										} ${value <= rating ? "active" : ""} ${
											burstIndex === value ? "burst" : ""
										}`}
										onMouseEnter={() => setHoveredRating(value)}
										onMouseLeave={() => setHoveredRating(0)}
										onClick={() => handleStarClick(value)}
										aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
									>
										<Star
											size={24}
											fill={value <= rating ? "currentColor" : "none"}
										/>
									</button>
								))}
							</div>
							{rating > 0 && (
								<p
									style={{
										textAlign: "center",
										color: "var(--color-gold)",
										fontSize: "0.875rem",
										marginTop: "0.5rem",
									}}
								>
									{rating === 1 && "We appreciate your honesty"}
									{rating === 2 && "Thanks for letting us know"}
									{rating === 3 && "We're working to improve"}
									{rating === 4 && "Great to hear!"}
									{rating === 5 && "Amazing! We're thrilled!"}
								</p>
							)}
						</fieldset>

						{/* What do you like? */}
						<div className="form-field">
							<label htmlFor="likes" className="form-label">
								What do you like?{" "}
								<span className="form-label-optional">(optional)</span>
							</label>
							<textarea
								id="likes"
								className="form-input form-textarea"
								placeholder="Tell us what's working well..."
								rows={3}
								value={likes}
								onChange={(e) => setLikes(e.target.value)}
								maxLength={1000}
							/>
						</div>

						{/* What could be improved? */}
						<div className="form-field">
							<label htmlFor="improvements" className="form-label">
								What could be improved?{" "}
								<span className="form-label-optional">(optional)</span>
							</label>
							<textarea
								id="improvements"
								className="form-input form-textarea"
								placeholder="Help us do better..."
								rows={3}
								value={improvements}
								onChange={(e) => setImprovements(e.target.value)}
								maxLength={1000}
							/>
						</div>

						{/* Feature requests */}
						<div className="form-field">
							<label htmlFor="features" className="form-label">
								Any feature requests?{" "}
								<span className="form-label-optional">(optional)</span>
							</label>
							<textarea
								id="features"
								className="form-input form-textarea"
								placeholder="What would you love to see..."
								rows={3}
								value={features}
								onChange={(e) => setFeatures(e.target.value)}
								maxLength={1000}
							/>
						</div>

						{/* Error Message */}
						{formState === "error" && errorMessage && (
							<div className="form-error-banner">{errorMessage}</div>
						)}

						{/* Submit Button */}
						<button
							type="submit"
							className="btn btn-primary w-full submit-btn"
							disabled={!isValid || formState === "loading"}
						>
							{formState === "loading" ? (
								<>
									<span
										className="spinner"
										style={{ width: "1.25rem", height: "1.25rem" }}
									/>
									Sending...
								</>
							) : (
								<>
									<Heart size={18} />
									Send Feedback
								</>
							)}
						</button>
					</form>
				</div>

				<div style={{ textAlign: "center", marginTop: "1.5rem" }}>
					<Link
						to="/help"
						style={{
							color: "var(--color-mist)",
							fontSize: "0.875rem",
							display: "inline-flex",
							alignItems: "center",
							gap: "0.5rem",
						}}
					>
						<ArrowLeft size={16} />
						Back to Help Center
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="landing-footer">
				<div className="landing-footer-links">
					<Link to="/">Home</Link>
					<Link to="/about">About</Link>
					<Link to="/pricing">Pricing</Link>
					<Link to="/terms">Terms</Link>
					<Link to="/privacy">Privacy</Link>
				</div>
				<p
					style={{
						marginTop: "1.5rem",
						marginBottom: 0,
						fontSize: "0.8125rem",
						color: "var(--color-sage)",
					}}
				>
					A{" "}
					<a
						href="https://resonantprojects.art"
						target="_blank"
						rel="noopener noreferrer"
						style={{ color: "var(--color-sage)" }}
					>
						Resonant Projects
					</a>{" "}
					creation
				</p>
			</footer>
		</div>
	);
}
