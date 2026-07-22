// local imports
import { ChangelogParser } from '../misc/changelog_parser.js';
import { ChangelogSerializer } from '../misc/changelog_serializer.js';
import { UNRELEASED_VERSION, type ChangeCategory } from '../misc/changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Add Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Inserts one entry under the `Unreleased` section's given category, creating
 * both the `Unreleased` section and the category heading if they are not
 * already present. Every other part of the file — other releases, link
 * references, prose — is left untouched.
 */
export class AddCommand {
	/**
	 * Adds `entry` under `category` in the `Unreleased` section.
	 *
	 * @param text The current `CHANGELOG.md` contents.
	 * @param category The change category to add under.
	 * @param entry The entry text (trimmed before storing).
	 * @returns The updated `CHANGELOG.md` contents.
	 * @throws If the exact same entry already exists under that category in `Unreleased`.
	 */
	static add(text: string, category: ChangeCategory, entry: string): string {
		const changelog = ChangelogParser.parse(text);
		const trimmedEntry = entry.trim();

		let unreleased = changelog.releases.find((release) => release.version === UNRELEASED_VERSION);
		if (unreleased === undefined) {
			unreleased = { version: UNRELEASED_VERSION, date: null, isYanked: false, description: null, categories: {} };
			changelog.releases.unshift(unreleased);
		}

		const existing = unreleased.categories[category] ?? [];
		if (existing.includes(trimmedEntry) === true) {
			throw new Error(`'${trimmedEntry}' is already listed under '${category}' in Unreleased`);
		}
		unreleased.categories[category] = [...existing, trimmedEntry];

		return ChangelogSerializer.serialize(changelog);
	}
}
