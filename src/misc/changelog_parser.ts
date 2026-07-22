// local imports
import type { Changelog, ChangelogRelease, LinkRef } from './changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Changelog Parser
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Matches a top-level `# Title` line. */
const TITLE_PATTERN = /^#\s+(.*)$/;

/** Matches a `## [version]`, optionally ` - YYYY-MM-DD`, optionally ` [YANKED]` release heading. */
const RELEASE_HEADING_PATTERN = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*(\[YANKED\])?\s*$/i;

/** Matches any `## ` heading line (used to locate section boundaries). */
const ANY_RELEASE_HEADING_PATTERN = /^##\s+/;

/** Matches a `### Category` heading line. */
const CATEGORY_HEADING_PATTERN = /^###\s+(.+?)\s*$/;

/** Matches a top-level bullet line (`- entry text`). */
const BULLET_PATTERN = /^-\s+(.*)$/;

/** Matches a link-reference-definition line (`[label]: url`). */
const LINK_REF_PATTERN = /^\[([^\]]+)\]:\s*(\S+)\s*$/;

/**
 * Parses `CHANGELOG.md` text into a {@link Changelog} model. Deliberately
 * permissive: malformed or non-conformant input is carried through as best it
 * can (e.g. an unparsable release heading keeps its raw text as the version),
 * rather than throwing. Structural/business-rule strictness is
 * `ValidateCommand`'s job, not the parser's.
 */
export class ChangelogParser {
	/**
	 * Parses raw `CHANGELOG.md` text into a {@link Changelog} model.
	 *
	 * @param text The full raw file contents.
	 * @returns The parsed model.
	 */
	static parse(text: string): Changelog {
		let lines = text.split(/\r\n|\n/);

		let title = 'Changelog';
		const titleMatch = lines.length > 0 ? TITLE_PATTERN.exec(lines[0]) : null;
		if (titleMatch !== null) {
			title = titleMatch[1].trim();
			lines = lines.slice(1);
		}

		const { body, linkRefs } = ChangelogParser._extractLinkRefBlock(lines);

		const firstHeadingIndex = body.findIndex((line) => ANY_RELEASE_HEADING_PATTERN.test(line));
		const preambleLines = firstHeadingIndex === -1 ? body : body.slice(0, firstHeadingIndex);
		const releaseLines = firstHeadingIndex === -1 ? [] : body.slice(firstHeadingIndex);

		return {
			title,
			preamble: ChangelogParser._trimBlock(preambleLines),
			releases: ChangelogParser._parseReleases(releaseLines),
			linkRefs,
		};
	}

	/**
	 * Peels the trailing link-reference-definition block off the end of the
	 * document: the maximal run of trailing lines that are each blank or a
	 * `[label]: url` line.
	 *
	 * @param lines The full document, split into lines (title already removed).
	 * @returns The remaining body lines and the extracted link refs, in original order.
	 */
	private static _extractLinkRefBlock(lines: string[]): { body: string[]; linkRefs: LinkRef[] } {
		let cut = lines.length;
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i];
			if (line.trim().length === 0 || LINK_REF_PATTERN.test(line) === true) {
				cut = i;
				continue;
			}
			break;
		}

		const body = lines.slice(0, cut);
		const linkRefs: LinkRef[] = [];
		for (const line of lines.slice(cut)) {
			const match = LINK_REF_PATTERN.exec(line);
			if (match !== null) {
				linkRefs.push({ label: match[1], url: match[2] });
			}
		}
		return { body, linkRefs };
	}

	/**
	 * Splits the release-heading-onward lines into per-release chunks and
	 * parses each one.
	 *
	 * @param lines Lines starting at the first `## ` heading (or empty).
	 * @returns One {@link ChangelogRelease} per `## ` heading found.
	 */
	private static _parseReleases(lines: string[]): ChangelogRelease[] {
		const headingIndexes: number[] = [];
		for (let i = 0; i < lines.length; i++) {
			if (ANY_RELEASE_HEADING_PATTERN.test(lines[i]) === true) {
				headingIndexes.push(i);
			}
		}

		const releases: ChangelogRelease[] = [];
		for (let i = 0; i < headingIndexes.length; i++) {
			const start = headingIndexes[i];
			const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : lines.length;
			releases.push(ChangelogParser._parseRelease(lines[start], lines.slice(start + 1, end)));
		}
		return releases;
	}

	/**
	 * Parses one release's heading line and body chunk.
	 *
	 * @param headingLine The `## [version] - date [YANKED]` heading line.
	 * @param bodyLines The lines between this heading and the next (or EOF).
	 * @returns The parsed release.
	 */
	private static _parseRelease(headingLine: string, bodyLines: string[]): ChangelogRelease {
		const headingMatch = RELEASE_HEADING_PATTERN.exec(headingLine);
		const version = headingMatch !== null ? headingMatch[1].trim() : headingLine.replace(/^##\s*/, '').trim();
		const date = headingMatch !== null && headingMatch[2] !== undefined ? headingMatch[2] : null;
		const isYanked = headingMatch !== null && headingMatch[3] !== undefined;

		const categoryIndexes: number[] = [];
		for (let i = 0; i < bodyLines.length; i++) {
			if (CATEGORY_HEADING_PATTERN.test(bodyLines[i]) === true) {
				categoryIndexes.push(i);
			}
		}

		const descriptionLines = categoryIndexes.length === 0 ? bodyLines : bodyLines.slice(0, categoryIndexes[0]);
		const description = ChangelogParser._trimBlock(descriptionLines);

		const categories: Record<string, string[]> = {};
		for (let i = 0; i < categoryIndexes.length; i++) {
			const start = categoryIndexes[i];
			const end = i + 1 < categoryIndexes.length ? categoryIndexes[i + 1] : bodyLines.length;
			const categoryMatch = CATEGORY_HEADING_PATTERN.exec(bodyLines[start]);
			const name = categoryMatch !== null ? categoryMatch[1].trim() : bodyLines[start].replace(/^###\s*/, '').trim();
			categories[name] = ChangelogParser._parseBullets(bodyLines.slice(start + 1, end));
		}

		return {
			version,
			date,
			isYanked,
			description: description.length > 0 ? description : null,
			categories,
		};
	}

	/**
	 * Parses a category's body into one raw text block per top-level bullet.
	 * A line starting a bullet (`- `) begins a new entry; any following
	 * non-blank, non-bullet line is treated as a verbatim continuation of that
	 * entry (line-wrapped text or a nested sub-list). Blank lines are dropped.
	 *
	 * @param lines The lines between a `### Category` heading and the next heading.
	 * @returns One string per bullet, newline-joined with its continuation lines.
	 */
	private static _parseBullets(lines: string[]): string[] {
		const entries: string[] = [];
		let current: string[] | null = null;

		for (const line of lines) {
			const bulletMatch = BULLET_PATTERN.exec(line);
			if (bulletMatch !== null) {
				if (current !== null) {
					entries.push(current.join('\n'));
				}
				current = [bulletMatch[1]];
				continue;
			}
			if (line.trim().length === 0) {
				continue;
			}
			if (current !== null) {
				current.push(line);
			}
		}
		if (current !== null) {
			entries.push(current.join('\n'));
		}
		return entries;
	}

	/**
	 * Joins lines and trims leading/trailing blank lines around a prose block.
	 *
	 * @param lines The lines to join.
	 * @returns The trimmed block text (empty string if `lines` has no content).
	 */
	private static _trimBlock(lines: string[]): string {
		return lines.join('\n').trim();
	}
}
