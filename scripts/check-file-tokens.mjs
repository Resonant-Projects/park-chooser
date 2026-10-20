#!/usr/bin/env node
/**
 * Pre-commit guard: block committing any file over MAX_TOKENS estimated tokens.
 *
 * Tokens are estimated as bytes / 4, so the limit is MAX_TOKENS * 4 bytes.
 * Only *staged* content is measured (the blob in the index, sized with
 * `git cat-file --batch-check`), never the working tree.
 *
 * Usage:
 *   node scripts/check-file-tokens.mjs          # check staged files (pre-commit)
 *   node scripts/check-file-tokens.mjs --all    # report every tracked file over the limit
 *
 * Dependency-free: Node >= 18 (or bun) and git are all it needs.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const MAX_TOKENS = 5000;
const BYTES_PER_TOKEN = 4;
const MAX_BYTES = MAX_TOKENS * BYTES_PER_TOKEN; // 20,000 bytes

// ---------------------------------------------------------------------------
// IGNORE LIST — files nobody writes by hand (lockfiles, codegen, assets).
//
// Glob rules (gitignore-like, kept deliberately tiny):
//   - A pattern WITHOUT "/" matches the file's basename anywhere in the tree.
//   - A pattern WITH "/" matches the full repo-relative path.
//   - "**" matches any number of path segments, "*" matches within a segment.
//
// To ignore a new path, add a line to the right group below.
// Git-detected binary files are ignored automatically (see isBinary).
// ---------------------------------------------------------------------------
const IGNORE_PATTERNS = [
	// Lockfiles
	"bun.lock",
	"bun.lockb",
	"package-lock.json",
	"npm-shrinkwrap.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"Cargo.lock",
	"poetry.lock",
	"uv.lock",
	"Gemfile.lock",
	"go.sum",
	"composer.lock",
	"flake.lock",

	// Generated / codegen
	"convex/_generated/**", // Convex API + data model codegen (repo-specific)
	"src/routeTree.gen.ts", // TanStack Router route tree (repo-specific)
	"routeTree.gen.ts",
	"**/generated/**",
	"**/_generated/**",
	"*.gen.*",
	"worker-configuration.d.ts",
	"*.map", // source maps
	"dist/**",
	"build/**",
	".output/**", // Nitro build output (repo-specific)
	".tanstack/**", // TanStack Start cache (repo-specific)

	// Minified bundles
	"*.min.*",

	// Test snapshots
	"__snapshots__/**",
	"**/__snapshots__/**",
	"*.snap",

	// Images
	"*.png",
	"*.jpg",
	"*.jpeg",
	"*.gif",
	"*.webp",
	"*.avif",
	"*.ico",
	"*.bmp",
	"*.tif",
	"*.tiff",
	"*.svg", // large SVGs are exported assets, not hand-written

	// Fonts
	"*.woff",
	"*.woff2",
	"*.ttf",
	"*.otf",
	"*.eot",

	// Archives / binaries / data blobs
	"*.zip",
	"*.tar",
	"*.gz",
	"*.tgz",
	"*.bz2",
	"*.xz",
	"*.7z",
	"*.rar",
	"*.pdf",
	"*.db",
	"*.sqlite",
	"*.sqlite3",
	"*.wasm",

	// Video / audio
	"*.mp4",
	"*.webm",
	"*.mov",
	"*.avi",
	"*.mkv",
	"*.mp3",
	"*.wav",
	"*.ogg",
	"*.flac",
	"*.m4a",
];

// --- glob matching ----------------------------------------------------------

function globToRegExp(glob) {
	let re = "";
	for (let i = 0; i < glob.length; i++) {
		const ch = glob[i];
		if (ch === "*") {
			if (glob[i + 1] === "*") {
				// "**/" matches zero or more directories; bare "**" matches anything.
				if (glob[i + 2] === "/") {
					re += "(?:.*/)?";
					i += 2;
				} else {
					re += ".*";
					i += 1;
				}
			} else {
				re += "[^/]*";
			}
		} else if (ch === "?") {
			re += "[^/]";
		} else {
			re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
		}
	}
	// "s" (dotAll) so "**" also spans newline characters in unusual filenames.
	return new RegExp(`^${re}$`, "s");
}

const COMPILED = IGNORE_PATTERNS.map((pattern) => ({
	pattern,
	basenameOnly: !pattern.includes("/"),
	re: globToRegExp(pattern),
}));

function isIgnored(filePath) {
	const base = path.posix.basename(filePath);
	return COMPILED.some(({ basenameOnly, re }) =>
		basenameOnly ? re.test(base) : re.test(filePath)
	);
}

// --- git helpers ------------------------------------------------------------

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function git(args, input) {
	return execFileSync("git", args, {
		encoding: "utf8",
		input,
		maxBuffer: 64 * 1024 * 1024,
	});
}

/**
 * Staged regular files as { path, oid }, including type changes (T) such as a
 * symlink replaced by a file. Parses `git diff --cached --raw -z`:
 *   ":<srcmode> <dstmode> <srcoid> <dstoid> <status>\0<path>\0"  (renames: "\0<old>\0<new>\0")
 * Paths may contain any byte except NUL, so we never split them on newlines.
 */
function stagedEntries() {
	const fields = git(["diff", "--cached", "--raw", "-z", "--diff-filter=ACMRT"]).split("\0");
	const entries = [];
	for (let i = 0; i + 1 < fields.length; i++) {
		const meta = fields[i];
		if (!meta.startsWith(":")) continue;
		const [, dstMode, , dstOid, status] = meta.slice(1).split(/\s+/);
		// Renames/copies carry two paths; the destination is the last one.
		const pathCount = /^[RC]/.test(status) ? 2 : 1;
		const filePath = fields[i + pathCount];
		i += pathCount;
		if (isRegularFile(dstMode)) entries.push({ path: filePath, oid: dstOid });
	}
	return entries;
}

/** All tracked regular files in the index as { path, oid } from `git ls-files -s -z`. */
function trackedEntries() {
	return git(["ls-files", "-s", "-z"])
		.split("\0")
		.filter(Boolean)
		.map((record) => {
			const tab = record.indexOf("\t"); // filenames may themselves contain tabs
			const meta = record.slice(0, tab);
			const filePath = record.slice(tab + 1);
			const [mode, oid] = meta.split(" ");
			return { mode, oid, path: filePath };
		})
		.filter((e) => isRegularFile(e.mode))
		.map(({ oid, path: filePath }) => ({ oid, path: filePath }));
}

/** Only regular blobs count; skip symlinks (120000) and submodules (160000). */
function isRegularFile(mode) {
	return mode === "100644" || mode === "100755";
}

/** Blob sizes by object id, one batched `git cat-file` call. Object ids never contain newlines. */
function blobSizes(oids) {
	if (oids.length === 0) return [];
	const out = git(["cat-file", "--batch-check=%(objectsize)"], `${oids.join("\n")}\n`);
	return out
		.trimEnd()
		.split("\n")
		.map((line) => (/^\d+$/.test(line) ? Number(line) : null));
}

/**
 * Tree object written from the current index (`git write-tree`, no commit).
 * Passing it as `--attr-source` makes git read .gitattributes exactly as
 * staged, so an unstaged working-tree edit to .gitattributes cannot change
 * what counts as binary. Computed once, lazily.
 */
let stagedAttrSource;
function attrSourceArgs() {
	if (stagedAttrSource === undefined) {
		try {
			stagedAttrSource = `--attr-source=${git(["write-tree"]).trim()}`;
		} catch {
			stagedAttrSource = null; // e.g. unmerged index; fall back to git's default
		}
	}
	return stagedAttrSource ? [stagedAttrSource] : [];
}

/**
 * Ask git itself whether it treats the staged blob as binary (NUL heuristic
 * plus any `binary` / `-diff` attribute). `--numstat` prints "-\t-" for binary
 * files and never has to load the whole blob into this process.
 */
function isBinary(filePath) {
	// Always compare the staged blob against the empty tree: diffing against
	// HEAD would report "binary" when only the *previous* version was binary.
	const out = git([
		"diff",
		...attrSourceArgs(),
		"--numstat",
		"-z",
		"--cached",
		EMPTY_TREE,
		"--",
		`:(literal)${filePath}`,
	]);
	return out.startsWith("-\t-\t");
}

// --- main -------------------------------------------------------------------

const all = process.argv.includes("--all");
const entries = (all ? trackedEntries() : stagedEntries()).filter((e) => !isIgnored(e.path));
const sizes = blobSizes(entries.map((e) => e.oid));

const offenders = [];
entries.forEach(({ path: file }, i) => {
	const bytes = sizes[i];
	if (bytes == null || bytes <= MAX_BYTES) return;
	if (isBinary(file)) return;
	offenders.push({ file, bytes, tokens: Math.ceil(bytes / BYTES_PER_TOKEN) });
});

if (offenders.length === 0) {
	if (all) console.log(`All tracked files are under ${MAX_TOKENS.toLocaleString()} tokens.`);
	process.exit(0);
}

offenders.sort((a, b) => b.bytes - a.bytes);
const fmt = (n) => n.toLocaleString("en-US");

if (all) {
	console.log(`${offenders.length} tracked file(s) exceed ${fmt(MAX_TOKENS)} tokens:\n`);
	for (const o of offenders) {
		console.log(`  ${o.file}  (~${fmt(o.tokens)} tokens, ${fmt(o.bytes)} bytes)`);
	}
	process.exit(1);
}

const lines = [
	"",
	`✖ Commit blocked: ${offenders.length} staged file(s) exceed the ${fmt(MAX_TOKENS)}-token limit`,
	`  (tokens ≈ bytes / ${BYTES_PER_TOKEN}, so the limit is ${fmt(MAX_BYTES)} bytes per file).`,
	"",
];
for (const o of offenders) {
	lines.push(`  ${o.file}`);
	lines.push(
		`      ~${fmt(o.tokens)} tokens (${fmt(o.bytes)} bytes) — over by ~${fmt(o.tokens - MAX_TOKENS)} tokens`
	);
}
lines.push(
	"",
	"Large files are hard for people and AI agents to read, review and edit safely.",
	"Split each file above before committing:",
	"",
	"  1. Split by responsibility: find the distinct concerns in the file and move",
	"     each into its own module (e.g. one file per feature, model, or route).",
	"  2. Move types, interfaces, constants and small helpers into their own files",
	"     (types.ts, constants.ts, utils.ts) and import them.",
	"  3. Extract components and sub-functions: large React components become",
	"     smaller components; long functions become named helpers.",
	"  4. If callers depend on a single import path, keep it working by",
	"     re-exporting from an index.ts in the new folder.",
	`  5. Keep every new file under ${fmt(MAX_TOKENS)} tokens (${fmt(MAX_BYTES)} bytes), then re-stage and commit.`,
	"",
	"Emergency bypass (use sparingly, and say why in the commit message):",
	"",
	"  git commit --no-verify",
	"",
	"Genuinely generated or non-authored file? Add its path or glob to",
	"IGNORE_PATTERNS in scripts/check-file-tokens.mjs (see the comment there).",
	""
);
console.error(lines.join("\n"));
process.exit(1);
