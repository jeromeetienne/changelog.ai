// local imports
import { ChangelogParser } from '../misc/changelog_parser.js';
import { ChangelogSerializer } from '../misc/changelog_serializer.js';
import { SemverUtils } from '../misc/semver_utils.js';
import { IsoDateSchema, SEMVER_PATTERN, UNRELEASED_VERSION, type ChangelogRelease } from '../misc/changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Release Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Outcome of making a release: the updated file text and any non-fatal warnings. */
export type ReleaseResult = {
	text: string;
	warnings: string[];
};

/**
 * Moves the `Unreleased` section's content into a new dated version section,
 * leaves a fresh empty `Unreleased` in its place, and regenerates the version
 * comparison links when the repo URL is known.
 */
export class ReleaseCommand {
	/**
	 * Makes a release from the current `Unreleased` content.
	 *
	 * @param text The current `CHANGELOG.md` contents.
	 * @param version The new version, as strict `MAJOR.MINOR.PATCH`.
	 * @param date The release date, `YYYY-MM-DD`.
	 * @param repoUrl The repo's base URL for regenerating comparison links, or `null` if unknown.
	 * @returns The updated text and any warnings (e.g. links left unchanged because `repoUrl` is unknown).
	 * @throws If `version` or `date` are malformed, `version` already exists, `version` is not
	 *   greater than the latest released version, or `Unreleased` has no content to release.
	 */
	static release(text: string, version: string, date: string, repoUrl: string | null): ReleaseResult {
		if (SEMVER_PATTERN.test(version) === false) {
			throw new Error(`'${version}' is not a MAJOR.MINOR.PATCH version`);
		}
		const dateCheck = IsoDateSchema.safeParse(date);
		if (dateCheck.success === false) {
			throw new Error(dateCheck.error.issues[0].message);
		}

		const changelog = ChangelogParser.parse(text);
		const unreleasedIndex = changelog.releases.findIndex((release) => release.version === UNRELEASED_VERSION);
		if (unreleasedIndex === -1) {
			throw new Error(`no 'Unreleased' section found; nothing to release`);
		}

		const unreleased = changelog.releases[unreleasedIndex];
		const hasContent = unreleased.description !== null || Object.values(unreleased.categories).some((entries) => entries.length > 0);
		if (hasContent === false) {
			throw new Error(`'Unreleased' has no content to release`);
		}

		if (changelog.releases.some((release) => release.version === version) === true) {
			throw new Error(`version '${version}' already exists`);
		}
		const latest = changelog.releases.find((release) => release.version !== UNRELEASED_VERSION);
		if (latest !== undefined && SemverUtils.compare(version, latest.version) <= 0) {
			throw new Error(`version '${version}' must be greater than the latest released version '${latest.version}'`);
		}

		const freshUnreleased: ChangelogRelease = {
			version: UNRELEASED_VERSION,
			date: null,
			isYanked: false,
			description: null,
			categories: {},
		};
		const newRelease: ChangelogRelease = { ...unreleased, version, date, isYanked: false };
		changelog.releases.splice(unreleasedIndex, 1, freshUnreleased, newRelease);

		const warnings: string[] = [];
		if (repoUrl === null) {
			warnings.push(`repo URL is unknown; comparison links were not updated for '${version}'`);
		}

		return { text: ChangelogSerializer.serialize(changelog, { repoUrl }), warnings };
	}
}
