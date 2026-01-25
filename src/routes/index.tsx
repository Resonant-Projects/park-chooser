import { useAuth } from "../integrations/clerk/provider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	CTASection,
	FloatingParticles,
	HeroSection,
	HowItWorksSection,
	ProblemSection,
	ValuePropsSection,
} from "../components/landing";
import { canonical, ogImage, SEO } from "../lib/seo/config";
import { softwareApplicationSchema } from "../lib/seo/schemas";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: `${SEO.siteName} - Random Park Picker for Families` },
			{ name: "description", content: SEO.defaultDescription },
			// OG
			{
				property: "og:title",
				content: `${SEO.siteName} - Random Park Picker for Families`,
			},
			{ property: "og:description", content: SEO.defaultDescription },
			{ property: "og:image", content: ogImage(SEO.defaultImage) },
			{ property: "og:url", content: canonical("/") },
			// Twitter
			{ name: "twitter:title", content: SEO.siteName },
			{ name: "twitter:description", content: SEO.defaultDescription },
			{ name: "twitter:image", content: ogImage(SEO.defaultImage) },
		],
		links: [{ rel: "canonical", href: canonical("/") }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(softwareApplicationSchema()),
			},
		],
	}),
	component: LandingPage,
});

function LandingPage() {
	const { isSignedIn, isLoaded } = useAuth();
	const navigate = useNavigate();

	// Redirect authenticated users to /app (client-side only)
	useEffect(() => {
		if (isLoaded && isSignedIn) {
			navigate({ to: "/app", replace: true });
		}
	}, [isLoaded, isSignedIn, navigate]);

	// Always render the landing page content for SSR/prerendering
	// Auth redirect happens client-side via useEffect
	return (
		<div className="landing-container">
			<FloatingParticles />
			<HeroSection />
			<ProblemSection />
			<HowItWorksSection />
			<ValuePropsSection />
			<CTASection />
		</div>
	);
}
