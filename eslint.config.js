import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import convexPlugin from "@convex-dev/eslint-plugin";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", "convex/_generated/**", ".vercel/**"],
  },

  // Base JavaScript rules
  eslint.configs.recommended,

  // Config files (mjs) - Node.js environment
  {
    files: ["*.config.mjs", "*.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript files in src/
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off", // TypeScript handles this
    },
  },

  // Convex TypeScript files (separate tsconfig)
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/_generated/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./convex/tsconfig.json",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@convex-dev": convexPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...convexPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off", // TypeScript handles this
    },
  },

  // Astro files
  ...astro.configs.recommended,
  {
    files: ["**/*.astro"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // set:html is sometimes needed for JSON-LD structured data
      "astro/no-set-html-directive": "warn",
      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
