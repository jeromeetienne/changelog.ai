// node imports
import Fs from 'node:fs';
import Path from 'node:path';

// local imports
import { PROJECT_ROOT } from '../misc/project_root.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Install Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Folder of bundled Claude Code assets (the changelog skills) mirrored into `.claude/`. */
const CLAUDE_SOURCE_DIR = 'dotclaude_folder';

/** Relative paths under the source folder that document the folder itself and must not be installed. */
const EXCLUDED_RELATIVE_PATHS = new Set<string>(['README.md']);

/** How the bundled assets are placed into the target: real copies or relative symlinks. */
export type InstallMode = 'copy' | 'symlink';

/** Per-target outcome of a mirror: the relative paths written. */
export type MirrorResult = {
	installed: string[];
};

/** Summary returned by {@link InstallCommand.install}. */
export type InstallResult = {
	claudeDir: string;
	mode: InstallMode;
	claude: MirrorResult;
};

/** Summary returned by {@link InstallCommand.uninstall}. */
export type UninstallResult = {
	claudeDir: string;
	removed: string[];
};

/**
 * Installs or removes the bundled changelog skills in a target `.claude`
 * directory by mirroring the package's `dotclaude_folder/`.
 */
export class InstallCommand {
	/**
	 * Mirrors the bundled `.claude` assets into the given destination directory.
	 *
	 * @param claudeDestination The `.claude` directory to install into (resolved to absolute).
	 * @param mode `copy` writes real files; `symlink` writes relative symlinks back to the source.
	 * @returns The resolved destination, the chosen mode, and the per-file install outcome.
	 */
	static install(claudeDestination: string, mode: InstallMode): InstallResult {
		const claudeSource = Path.resolve(PROJECT_ROOT, CLAUDE_SOURCE_DIR);
		InstallCommand._requireDir(claudeSource);

		const claudeDir = Path.resolve(claudeDestination);
		const claude = mode === 'symlink' ? InstallCommand._mirrorSymlink(claudeSource, claudeDir) : InstallCommand._mirrorCopy(claudeSource, claudeDir);

		return { claudeDir, mode, claude };
	}

	/**
	 * Removes every installed asset from the destination, whether it was copied or
	 * symlinked, then prunes the directories left empty. Targets that no longer exist
	 * are silently ignored.
	 *
	 * @param claudeDestination The `.claude` directory to uninstall from (resolved to absolute).
	 * @returns The resolved destination and the relative paths that were removed.
	 */
	static uninstall(claudeDestination: string): UninstallResult {
		const claudeSource = Path.resolve(PROJECT_ROOT, CLAUDE_SOURCE_DIR);
		InstallCommand._requireDir(claudeSource);

		const claudeDir = Path.resolve(claudeDestination);
		const removed: string[] = [];

		for (const source of InstallCommand._collectFiles(claudeSource)) {
			const rel = Path.relative(claudeSource, source);
			if (EXCLUDED_RELATIVE_PATHS.has(rel) === true) {
				continue;
			}

			const target = Path.join(claudeDir, rel);
			if (InstallCommand._pathPresent(target) === false) {
				continue;
			}

			Fs.unlinkSync(target);
			removed.push(rel);
			InstallCommand._pruneEmptyDirs(Path.dirname(target), claudeDir);
		}

		return { claudeDir, removed };
	}

	/**
	 * Renders an {@link InstallResult} in the requested format.
	 *
	 * @param result The outcome of {@link InstallCommand.install}.
	 * @param format Output format, either `markdown` or `json`.
	 * @returns The rendered string ready to print.
	 * @throws If `format` is neither `markdown` nor `json`.
	 */
	static formatInstall(result: InstallResult, format: string): string {
		InstallCommand._requireFormat(format);
		if (format === 'json') {
			return JSON.stringify(result);
		}

		const lines: string[] = [`# Installed the changelog skills (${result.mode})`, '', `- target: \`${result.claudeDir}\``, `- installed: ${result.claude.installed.length}`];
		InstallCommand._appendFileSection(lines, 'Installed', result.claude.installed);
		return lines.join('\n');
	}

	/**
	 * Renders an {@link UninstallResult} in the requested format.
	 *
	 * @param result The outcome of {@link InstallCommand.uninstall}.
	 * @param format Output format, either `markdown` or `json`.
	 * @returns The rendered string ready to print.
	 * @throws If `format` is neither `markdown` nor `json`.
	 */
	static formatUninstall(result: UninstallResult, format: string): string {
		InstallCommand._requireFormat(format);
		if (format === 'json') {
			return JSON.stringify(result);
		}

		const lines: string[] = ['# Uninstalled the changelog skills', '', `- target: \`${result.claudeDir}\``, `- removed: ${result.removed.length}`];
		if (result.removed.length === 0) {
			lines.push('', '_Nothing to remove; the changelog skills were not present._');
			return lines.join('\n');
		}
		InstallCommand._appendFileSection(lines, 'Removed', result.removed);
		return lines.join('\n');
	}

	/**
	 * Recursively copies every file under `sourceRoot` into `targetRoot`, preserving
	 * relative paths and honoring the exclusion list.
	 *
	 * @param sourceRoot The directory whose contents are copied.
	 * @param targetRoot The directory the contents are copied into.
	 * @returns The relative paths that were installed.
	 */
	private static _mirrorCopy(sourceRoot: string, targetRoot: string): MirrorResult {
		const installed: string[] = [];

		for (const source of InstallCommand._collectFiles(sourceRoot)) {
			const rel = Path.relative(sourceRoot, source);
			if (EXCLUDED_RELATIVE_PATHS.has(rel) === true) {
				continue;
			}

			const target = Path.join(targetRoot, rel);
			Fs.mkdirSync(Path.dirname(target), { recursive: true });
			InstallCommand._removeIfPresent(target);
			Fs.copyFileSync(source, target);
			installed.push(rel);
		}

		return { installed };
	}

	/**
	 * Mirrors every file under `sourceRoot` into `targetRoot` as a relative symlink
	 * pointing back at the source, replacing whatever (file or symlink) is already there.
	 *
	 * Assumes `targetRoot` and `sourceRoot` share a filesystem tree with no symlink
	 * components between them (the normal in-repo `.claude` case). If the target is
	 * reached through a symlink (e.g. a temp dir under macOS `/var` → `/private/var`),
	 * the relative links can dangle — use `--mode copy` for such targets.
	 *
	 * @param sourceRoot The directory whose files are linked.
	 * @param targetRoot The directory the symlinks are written into.
	 * @returns The relative paths that were linked.
	 */
	private static _mirrorSymlink(sourceRoot: string, targetRoot: string): MirrorResult {
		const installed: string[] = [];

		for (const source of InstallCommand._collectFiles(sourceRoot)) {
			const rel = Path.relative(sourceRoot, source);
			if (EXCLUDED_RELATIVE_PATHS.has(rel) === true) {
				continue;
			}

			const target = Path.join(targetRoot, rel);
			Fs.mkdirSync(Path.dirname(target), { recursive: true });
			InstallCommand._removeIfPresent(target);
			Fs.symlinkSync(Path.relative(Path.dirname(target), source), target);
			installed.push(rel);
		}

		return { installed };
	}

	/**
	 * Recursively collects the absolute paths of every regular file under a directory.
	 *
	 * @param dir The directory to walk.
	 * @returns The absolute paths of all files found beneath `dir`.
	 */
	private static _collectFiles(dir: string): string[] {
		const files: string[] = [];
		for (const entry of Fs.readdirSync(dir, { withFileTypes: true })) {
			const full = Path.join(dir, entry.name);
			if (entry.isDirectory() === true) {
				files.push(...InstallCommand._collectFiles(full));
				continue;
			}
			if (entry.isFile() === true) {
				files.push(full);
			}
		}
		return files;
	}

	/**
	 * Reports whether a path exists on disk, treating a symlink as present even when
	 * its target is missing (`existsSync` follows the link and would miss it).
	 *
	 * @param path The path to test.
	 * @returns True if a file, directory, or symlink lives at `path`.
	 */
	private static _pathPresent(path: string): boolean {
		try {
			Fs.lstatSync(path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Removes a path if anything (file or symlink) currently lives there.
	 *
	 * @param path The path to remove.
	 */
	private static _removeIfPresent(path: string): void {
		if (InstallCommand._pathPresent(path) === true) {
			Fs.unlinkSync(path);
		}
	}

	/**
	 * Removes now-empty directories walking up from `dir` until (but not including)
	 * `stopAt`. Stops at the first non-empty directory.
	 *
	 * @param dir The deepest directory to consider for removal.
	 * @param stopAt The boundary directory that is never removed.
	 */
	private static _pruneEmptyDirs(dir: string, stopAt: string): void {
		let current = dir;
		// `stopAt + sep` so a sibling that merely shares the prefix (e.g. `.claude2`
		// vs `.claude`) is never treated as inside `stopAt`.
		while (current !== stopAt && current.startsWith(stopAt + Path.sep) === true) {
			try {
				Fs.rmdirSync(current);
			} catch {
				return;
			}
			current = Path.dirname(current);
		}
	}

	/**
	 * Asserts that a directory exists, throwing if it does not.
	 *
	 * @param dir The directory expected to exist.
	 * @throws If `dir` does not exist.
	 */
	private static _requireDir(dir: string): void {
		if (Fs.existsSync(dir) === false) {
			throw new Error(`bundled assets not found at ${dir}`);
		}
	}

	/**
	 * Asserts that a format string is one this command can render.
	 *
	 * @param format The requested output format.
	 * @throws If `format` is neither `markdown` nor `json`.
	 */
	private static _requireFormat(format: string): void {
		if (format !== 'markdown' && format !== 'json') {
			throw new Error(`unknown format '${format}', expected 'markdown' or 'json'`);
		}
	}

	/**
	 * Appends a titled markdown bullet list of relative paths, skipping empty lists.
	 *
	 * @param lines The line buffer being built; mutated in place.
	 * @param title The section heading.
	 * @param relPaths The relative paths to list under it.
	 */
	private static _appendFileSection(lines: string[], title: string, relPaths: string[]): void {
		if (relPaths.length === 0) {
			return;
		}
		lines.push('', `## ${title}`);
		for (const rel of relPaths) {
			lines.push(`- \`${rel}\``);
		}
	}
}
