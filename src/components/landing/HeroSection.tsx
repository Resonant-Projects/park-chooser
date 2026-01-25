import { Link } from "@tanstack/react-router";
import { TreeDeciduous, TreePine, Trees } from "lucide-react";

export function HeroSection() {
	return (
		<section className="landing-hero">
			<div className="icon-cluster" aria-hidden="true">
				<TreePine size={36} style={{ marginBottom: "4px" }} />
				<Trees size={56} />
				<TreeDeciduous size={40} style={{ marginBottom: "2px" }} />
			</div>

			<h1 className="title" style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
				<span className="text-gradient">Which park today?</span>
				<br />
				Let us decide.
			</h1>

			<p
				className="subtitle"
				style={{
					maxWidth: "480px",
					fontSize: "1.125rem",
					lineHeight: 1.6,
					marginBottom: "2rem",
				}}
			>
				End the endless "where should we go?" debate. One tap picks your family's next
				outdoor adventure.
			</p>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "1rem",
				}}
			>
				<Link to="/sign-up" className="btn btn-primary btn-lg">
					Get Started Free
				</Link>
				<Link
					to="/sign-in"
					style={{
						color: "var(--color-mist)",
						fontSize: "0.9375rem",
					}}
				>
					Already have an account? Sign In
				</Link>
			</div>
		</section>
	);
}
