export default {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.astro": ["eslint --fix", "prettier --write"],
  "*.css": ["prettier --write"],
  "*.{json,md}": ["prettier --write"],
};
