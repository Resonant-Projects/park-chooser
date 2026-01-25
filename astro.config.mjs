// @ts-check

import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || "https://pickapark.app",
	output: "server",
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		clerk(),
		sitemap({
			filter: (page) => {
				// Exclude auth, protected, and API pages from sitemap
				const excludePatterns = [
					"/sign-in",
					"/sign-up",
					"/stats",
					"/manage",
					"/discover",
					"/account",
					"/help/feedback",
					"/api/",
					"/r/",
				];
				return !excludePatterns.some((pattern) => page.includes(pattern));
			},
		}),
	],
	adapter: vercel(),
});
