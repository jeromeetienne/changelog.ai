// local imports
import { ChangelogParser } from '../misc/changelog_parser.js';
import { ChangelogSerializer } from '../misc/changelog_serializer.js';
import { UNRELEASED_VERSION } from '../misc/changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Show Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Renders one release's body (description + categorized bullets, without its
 * `## [version] - date` heading) as standalone Markdown — ready to pipe into
 * e.g. `gh release create -F -`.
 */
export class ShowCommand {
	/**
	 * Renders the body of one release.
	 *
	 * @param text The current `CHANGELOG.md` contents.
	 * @param version The version to show, or `'Unreleased'` (case-insensitive).
	 * @returns The release body as Markdown, with no leading or trailing blank lines.
	 * @throws If no release matches `version`.
	 */
	static show(text: string, version: string): string {
		const changelog = ChangelogParser.parse(text);
		const normalized = version.toLowerCase() === UNRELEASED_VERSION.toLowerCase() ? UNRELEASED_VERSION : version;

		const release = changelog.releases.find((entry) => entry.version === normalized);
		if (release === undefined) {
			const known = changelog.releases.map((entry) => entry.version).join(', ');
			throw new Error(`no release '${version}' found (known: ${known})`);
		}

		const lines: string[] = [];
		if (release.description !== null && release.description.length > 0) {
			lines.push(release.description, '');
		}
		lines.push(...ChangelogSerializer.renderCategories(release.categories));

		while (lines.length > 0 && lines[lines.length - 1] === '') {
			lines.pop();
		}
		return lines.join('\n');
	}
}
