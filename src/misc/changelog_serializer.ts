// local imports
import { CHANGE_CATEGORIES, SEMVER_PATTERN, UNRELEASED_VERSION, type Changelog, type ChangelogRelease } from './changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Changelog Serializer
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Options controlling how {@link ChangelogSerializer.serialize} regenerates link references. */
export type SerializeOptions = {
	repoUrl?: string | null;
};

/**
 * Renders a {@link Changelog} model back to canonical Keep a Changelog 1.1.0
 * Markdown. Every mutation in this project goes parse -> modify model ->
 * serialize, so the file never drifts from canonical form.
 */
export class ChangelogSerializer {
	/**
	 * Serializes a {@link Changelog} model to Markdown text.
	 *
	 * @param changelog The model to render.
	 * @param options `repoUrl`, when known, regenerates version comparison
	 *   links from `changelog.releases`; when omitted or `null`, the existing
	 *   `linkRefs` are passed through verbatim so links are never invented or
	 *   silently dropped.
	 * @returns The full `CHANGELOG.md` text, ending in exactly one trailing newline.
	 */
	static serialize(changelog: Changelog, options: SerializeOptions = {}): string {
		const lines: string[] = [`# ${changelog.title}`, ''];

		if (changelog.preamble.length > 0) {
			lines.push(changelog.preamble, '');
		}

		for (const release of changelog.releases) {
			lines.push(...ChangelogSerializer._serializeRelease(release), '');
		}

		lines.push(...ChangelogSerializer._serializeLinkRefs(changelog, options.repoUrl ?? null));

		while (lines.length > 0 && lines[lines.length - 1] === '') {
			lines.pop();
		}
		return `${lines.join('\n')}\n`;
	}

	/**
	 * Renders a release's categories as `### Category` blocks: canonical
	 * categories first (in {@link CHANGE_CATEGORIES} order), then any
	 * non-canonical ones in their original (encountered) order, so nothing
	 * from a permissive parse is silently dropped. Categories with no entries
	 * are omitted. Shared by {@link ChangelogSerializer.serialize} and by
	 * `ShowCommand`, which renders a single release body the same way.
	 *
	 * @param categories The release's categories.
	 * @returns The rendered lines, each non-empty category followed by a blank line.
	 */
	static renderCategories(categories: Record<string, string[]>): string[] {
		const out: string[] = [];
		const canonical: readonly string[] = CHANGE_CATEGORIES;
		for (const category of CHANGE_CATEGORIES) {
			ChangelogSerializer._appendCategory(out, category, categories[category]);
		}
		for (const [name, entries] of Object.entries(categories)) {
			if (canonical.includes(name) === true) {
				continue;
			}
			ChangelogSerializer._appendCategory(out, name, entries);
		}
		return out;
	}

	/**
	 * Renders one release section: heading, optional description, then its categories.
	 *
	 * @param release The release to render.
	 * @returns The release's lines, with no trailing blank line.
	 */
	private static _serializeRelease(release: ChangelogRelease): string[] {
		let heading = `## [${release.version}]`;
		if (release.date !== null) {
			heading += ` - ${release.date}`;
		}
		if (release.isYanked === true) {
			heading += ` [YANKED]`;
		}

		const out = [heading, ''];
		if (release.description !== null && release.description.length > 0) {
			out.push(release.description, '');
		}
		out.push(...ChangelogSerializer.renderCategories(release.categories));

		while (out.length > 0 && out[out.length - 1] === '') {
			out.pop();
		}
		return out;
	}

	/**
	 * Appends one `### Category` block (heading + bullets) to `out`, or does
	 * nothing when there are no entries.
	 *
	 * @param out The line buffer being built; mutated in place.
	 * @param name The category heading text.
	 * @param entries The bullet blocks for this category, if any.
	 */
	private static _appendCategory(out: string[], name: string, entries: string[] | undefined): void {
		if (entries === undefined || entries.length === 0) {
			return;
		}
		out.push(`### ${name}`, '');
		for (const entry of entries) {
			const [firstLine, ...rest] = entry.split('\n');
			out.push(`- ${firstLine}`, ...rest);
		}
		out.push('');
	}

	/**
	 * Renders the trailing link-reference-definition block.
	 *
	 * Without a known `repoUrl`, every parsed link ref is passed through
	 * verbatim. With a known `repoUrl`, version-shaped refs (`Unreleased` or a
	 * semver token) are regenerated from `changelog.releases` in GitHub's
	 * `compare`/`releases/tag` convention, and any other existing refs (e.g. a
	 * hand-added `[SemVer]: ...`) are preserved after them, in their original
	 * order.
	 *
	 * @param changelog The model being serialized.
	 * @param repoUrl The repo's base URL (e.g. `https://github.com/owner/repo`), or `null` if unknown.
	 * @returns The link-reference lines, in the order they should be printed.
	 */
	private static _serializeLinkRefs(changelog: Changelog, repoUrl: string | null): string[] {
		if (repoUrl === null) {
			return changelog.linkRefs.map((ref) => `[${ref.label}]: ${ref.url}`);
		}

		const releasedVersions = changelog.releases.map((release) => release.version).filter((version) => version !== UNRELEASED_VERSION);
		const hasUnreleased = changelog.releases.some((release) => release.version === UNRELEASED_VERSION);

		const lines: string[] = [];
		if (hasUnreleased === true && releasedVersions.length > 0) {
			lines.push(`[${UNRELEASED_VERSION}]: ${repoUrl}/compare/v${releasedVersions[0]}...HEAD`);
		}
		for (let i = 0; i < releasedVersions.length; i++) {
			const version = releasedVersions[i];
			const previous = releasedVersions[i + 1];
			if (previous === undefined) {
				lines.push(`[${version}]: ${repoUrl}/releases/tag/v${version}`);
			} else {
				lines.push(`[${version}]: ${repoUrl}/compare/v${previous}...v${version}`);
			}
		}

		for (const ref of changelog.linkRefs) {
			if (ChangelogSerializer._isVersionShaped(ref.label) === true) {
				continue;
			}
			lines.push(`[${ref.label}]: ${ref.url}`);
		}
		return lines;
	}

	/**
	 * Reports whether a link-ref label denotes a version (`Unreleased` or a
	 * semver token), as opposed to an unrelated reference like `[SemVer]`.
	 *
	 * @param label The link-ref label.
	 * @returns True if the label is version-shaped.
	 */
	private static _isVersionShaped(label: string): boolean {
		return label.toLowerCase() === UNRELEASED_VERSION.toLowerCase() || SEMVER_PATTERN.test(label);
	}
}
