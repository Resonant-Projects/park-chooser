import { PricingTable } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { canonical, SEO } from "../lib/seo/config";

export const Route = createFileRoute("/support")({
	head: () => ({
		meta: [
			{ title: `Support Park Chooser - ${SEO.siteName}` },
			{
				name: "description",
				content:
					"Support Park Chooser with an optional subscription. All features stay available for every signed-in user.",
			},
		],
		links: [{ rel: "canonical", href: canonical("/support") }],
	}),
	component: SupportPage,
});

const faqs = [
	{
		question: "Do I need to pay to use Park Chooser?",
		answer: "No. Every signed-in user gets the full app, including unlimited parks, unlimited picks, discovery, and visit tracking.",
	},
	{
		question: "What does supporter billing do?",
		answer: "It helps fund ongoing development and operating costs. Supporter billing does not unlock extra features.",
	},
	{
		question: "How do I cancel my supporter subscription?",
		answer: "You can cancel anytime from your account settings. Your support continues through the end of the current billing period.",
	},
	{
		question: "Can I keep using the app if I cancel?",
		answer: "Yes. Canceling support does not remove access to any app features or your saved parks and visit history.",
	},
	{
		question: "Do you offer refunds?",
		answer: "If you need help with a charge, contact support and we’ll review it with you.",
	},
];

function SupportPage() {
	const [openFaq, setOpenFaq] = useState<number | null>(0);

	return (
		<div className="pricing-page-container">
			<header className="pricing-hero">
				<div className="help-hero-icon" style={{ marginBottom: "1rem" }}>
					<Heart size={40} />
				</div>
				<h1 className="pricing-hero-title">
					<span className="text-gradient">Support Park Chooser</span>
				</h1>
				<p className="pricing-hero-subtitle">
					Every signed-in user gets the full app. Support is optional and appreciated.
				</p>
			</header>

			<section className="pricing-table-section">
				<PricingTable />
			</section>

			<section className="faq-section">
				<h2 className="section-header">Frequently Asked Questions</h2>
				<div className="faq-list">
					{faqs.map((faq, index) => (
						<FaqItem
							key={faq.question}
							question={faq.question}
							answer={faq.answer}
							isOpen={openFaq === index}
							onClick={() => setOpenFaq(openFaq === index ? null : index)}
						/>
					))}
				</div>
			</section>

			<footer className="landing-footer">
				<nav className="landing-footer-links">
					<Link to="/">Home</Link>
					<Link to="/about">About</Link>
					<Link to="/help">Help</Link>
					<Link to="/terms">Terms</Link>
					<Link to="/privacy">Privacy</Link>
				</nav>
			</footer>
		</div>
	);
}

function FaqItem({
	question,
	answer,
	isOpen,
	onClick,
}: {
	question: string;
	answer: string;
	isOpen: boolean;
	onClick: () => void;
}) {
	return (
		<div className="faq-item">
			<button type="button" className="faq-question" onClick={onClick} aria-expanded={isOpen}>
				{question}
				<span className="faq-toggle" aria-hidden="true">
					{isOpen ? "▲" : "▼"}
				</span>
			</button>
			{isOpen && <p className="faq-answer">{answer}</p>}
		</div>
	);
}

export default SupportPage;
