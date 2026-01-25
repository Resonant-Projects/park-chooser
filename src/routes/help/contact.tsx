import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { ArrowLeft, CheckCircle, MessageSquare, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { FloatingParticles } from "../../components/landing";
import { canonical, SEO } from "../../lib/seo/config";

export const Route = createFileRoute("/help/contact")({
	head: () => ({
		meta: [
			{ title: `Contact Support - ${SEO.siteName}` },
			{
				name: "description",
				content: `Need help with ${SEO.siteName}? Contact our support team for assistance with bugs, billing, features, or any questions.`,
			},
			{ property: "og:title", content: `Contact Support - ${SEO.siteName}` },
			{
				property: "og:description",
				content: `Need help with ${SEO.siteName}? Contact our support team for assistance.`,
			},
			{ property: "og:url", content: canonical("/help/contact") },
		],
		links: [{ rel: "canonical", href: canonical("/help/contact") }],
	}),
	component: ContactPage,
});

type SubjectType = "bug" | "billing" | "feature" | "other";

const subjects = [
	{ value: "bug", label: "Bug Report" },
	{ value: "billing", label: "Billing Question" },
	{ value: "feature", label: "Feature Request" },
	{ value: "other", label: "Other" },
] as const;

async function getBrowserFingerprintHash(): Promise<string> {
	// SSR safety: return fallback when browser APIs unavailable
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return "server-side";
	}

	const data = [
		navigator.userAgent,
		navigator.language,
		new Date().toDateString(),
		typeof screen !== "undefined" ? screen.width : 0,
		typeof screen !== "undefined" ? screen.height : 0,
	].join("|");

	// crypto.subtle may not be available in insecure contexts
	if (!window.crypto?.subtle) {
		// Simple hash fallback
		let hash = 0;
		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(16).slice(0, 16);
	}

	const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 16);
}

function ContactPage() {
	const submitTicket = useAction(api.actions.submitSupportTicket.submitSupportTicket);

	const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [referenceId, setReferenceId] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");

	// Form fields
	const [email, setEmail] = useState("");
	const [subject, setSubject] = useState<SubjectType>("bug");
	const [message, setMessage] = useState("");
	const [honeypot, setHoneypot] = useState("");

	// Validation
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const emailError = touched.email && (!email.includes("@") || email.length < 5);
	const messageError = touched.message && message.length < 20;
	const messageOverLimit = message.length > 2000;

	const isValid =
		email.includes("@") && email.length >= 5 && message.length >= 20 && message.length <= 2000;

	const getCharCountClass = useCallback(() => {
		if (message.length > 2000) return "char-counter danger";
		if (message.length > 1800) return "char-counter warning";
		return "char-counter";
	}, [message.length]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid || formState === "loading") return;

		setFormState("loading");
		setErrorMessage("");

		try {
			const ipHash = await getBrowserFingerprintHash();
			const result = await submitTicket({
				email,
				subject,
				message,
				honeypot: honeypot || undefined,
				ipHash,
			});

			if (result.success) {
				setReferenceId(result.referenceId);
				setFormState("success");
			} else {
				setErrorMessage(result.error || "Something went wrong. Please try again.");
				setFormState("error");
			}
		} catch (err) {
			setErrorMessage(
				err instanceof Error ? err.message : "Something went wrong. Please try again."
			);
			setFormState("error");
		}
	};

	if (formState === "success") {
		return (
			<div className="landing-container">
				<FloatingParticles />

				<section className="help-hero" style={{ minHeight: "50vh" }}>
					<div className="success-state">
						<div className="success-icon">
							<CheckCircle size={64} />
						</div>
						<h1 className="title" style={{ fontSize: "2rem", marginBottom: "1rem" }}>
							<span className="text-gradient">Message Sent!</span>
						</h1>
						<p
							style={{
								color: "var(--color-mist)",
								fontSize: "1rem",
								marginBottom: "1.5rem",
							}}
						>
							We typically respond within 24-48 hours.
						</p>
						<p
							style={{
								color: "var(--color-mist)",
								fontSize: "0.875rem",
								marginBottom: "0.5rem",
							}}
						>
							Your reference number:
						</p>
						<p className="reference-id">{referenceId}</p>
						<Link
							to="/help"
							className="btn btn-secondary"
							style={{ marginTop: "2rem" }}
						>
							<ArrowLeft size={18} />
							Back to Help Center
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
					<MessageSquare size={48} />
				</div>
				<h1 className="title" style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
					<span className="text-gradient">Contact Support</span>
				</h1>
				<p className="subtitle" style={{ maxWidth: "400px", animationDelay: "0.3s" }}>
					We typically respond within 24-48 hours
				</p>
			</section>

			{/* Contact Form */}
			<section className="landing-section">
				<div className="glass-card-accent">
					<form onSubmit={handleSubmit} noValidate>
						{/* Honeypot - hidden from real users */}
						<div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
							<label htmlFor="website">Website</label>
							<input
								type="text"
								id="website"
								name="website"
								tabIndex={-1}
								autoComplete="off"
								value={honeypot}
								onChange={(e) => setHoneypot(e.target.value)}
							/>
						</div>

						{/* Email */}
						<div className="form-field">
							<label htmlFor="email" className="form-label">
								Email Address
							</label>
							<input
								type="email"
								id="email"
								className={`form-input ${emailError ? "error" : ""}`}
								placeholder="your@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onBlur={() => setTouched({ ...touched, email: true })}
								required
							/>
							{emailError && (
								<span className="form-error">
									Please enter a valid email address
								</span>
							)}
						</div>

						{/* Subject */}
						<div className="form-field">
							<label htmlFor="subject" className="form-label">
								Subject
							</label>
							<select
								id="subject"
								className="form-input form-select"
								value={subject}
								onChange={(e) => setSubject(e.target.value as SubjectType)}
							>
								{subjects.map((s) => (
									<option key={s.value} value={s.value}>
										{s.label}
									</option>
								))}
							</select>
						</div>

						{/* Message */}
						<div className="form-field">
							<label htmlFor="message" className="form-label">
								Message
							</label>
							<textarea
								id="message"
								className={`form-input form-textarea ${messageError || messageOverLimit ? "error" : ""}`}
								placeholder="Tell us how we can help..."
								rows={6}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								onBlur={() => setTouched({ ...touched, message: true })}
								required
							/>
							<div className="form-field-footer">
								{messageError && (
									<span className="form-error">
										Message must be at least 20 characters
									</span>
								)}
								{messageOverLimit && (
									<span className="form-error">
										Message must be less than 2000 characters
									</span>
								)}
								<span className={getCharCountClass()}>{message.length}/2000</span>
							</div>
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
									<Send size={18} />
									Send Message
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
