import { Heart, Shuffle, Zap } from "lucide-react";

const valueProps = [
	{
		icon: Zap,
		title: "Instant Decisions",
		description: "Picks in under a second. More time playing, less time debating.",
	},
	{
		icon: Shuffle,
		title: "Built-in Variety",
		description: "Rotates through your list so you explore new spots.",
	},
	{
		icon: Heart,
		title: "Family-Friendly",
		description: "Designed for busy parents who just want to get outside.",
	},
];

export function ValuePropsSection() {
	return (
		<section className="landing-section-wide">
			<div className="landing-grid-3">
				{valueProps.map((prop, index) => {
					const Icon = prop.icon;
					return (
						<div
							key={index}
							className={`glass-card animate-slide-up delay-${(index + 1) * 100}`}
							style={{ textAlign: "center" }}
						>
							<div
								style={{
									width: "3.5rem",
									height: "3.5rem",
									borderRadius: "50%",
									background: "rgba(212, 168, 75, 0.15)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									margin: "0 auto 1rem",
								}}
							>
								<Icon size={24} style={{ color: "var(--color-gold)" }} />
							</div>
							<h3
								style={{
									fontFamily: '"Fraunces", Georgia, serif',
									fontSize: "1.125rem",
									fontWeight: 600,
									color: "var(--color-cream)",
									margin: "0 0 0.5rem",
								}}
							>
								{prop.title}
							</h3>
							<p
								style={{
									color: "var(--color-mist)",
									fontSize: "0.9375rem",
									lineHeight: 1.5,
									margin: 0,
								}}
							>
								{prop.description}
							</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
