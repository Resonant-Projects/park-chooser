export default {
	"*.{ts,tsx}": ["biome check --write", "eslint --fix"],
	"*.{js,mjs}": ["biome check --write"],
	"*.{json,css}": ["biome format --write"],
};
