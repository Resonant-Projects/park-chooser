import convexPlugin from "@convex-dev/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import tsParser from "@typescript-eslint/parser";

export default [
	// Global ignores
	{
		ignores: [
			"dist/**",
			".output/**",
			"node_modules/**",
			"convex/_generated/**",
			".vercel/**",
			"src/routeTree.gen.ts",
			"**/*.d.ts",
		],
	},

	// Convex-specific rules
	{
		files: ["convex/**/*.ts"],
		ignores: ["convex/_generated/**"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./convex/tsconfig.json",
			},
		},
		plugins: { "@convex-dev": convexPlugin },
		rules: { ...convexPlugin.configs.recommended.rules },
	},

	// TanStack Router rules
	{
		files: ["src/routes/**/*.tsx"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: { "@tanstack/router": pluginRouter },
		rules: { "@tanstack/router/create-route-property-order": "error" },
	},

	// TanStack Query rules
	{
		files: ["src/**/*.ts", "src/**/*.tsx"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: { "@tanstack/query": pluginQuery },
		rules: {
			"@tanstack/query/exhaustive-deps": "error",
			"@tanstack/query/stable-query-client": "error",
			"@tanstack/query/no-rest-destructuring": "warn",
		},
	},
];
