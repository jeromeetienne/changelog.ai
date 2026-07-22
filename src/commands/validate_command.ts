// local imports
import { ChangelogParser } from '../misc/changelog_parser.js';
import { SemverUtils } from '../misc/semver_utils.js';
import {
	CHANGE_CATEGORIES,
	ChangeEntrySchema,
	IsoDateSchema,
	UNRELEASED_VERSION,
	VersionSchema,
	type ChangelogRelease,
	type LinkRef,
} from '../misc/changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Validate Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Outcome of validating a `CHANGELOG.md`: whether it conforms, plus human-readable problems. */
export type ValidateResult = {
	valid: boolean;
	errors: string[];
	warnings: string[];
};

const CANONICAL_CATEGORIES: readonly string[] = CHANGE_CATEGORIES;

/**
 * Validates `CHANGELOG.md` text against the Keep a Changelog 1.1.0 structural
 * rules. This is the gate every skill runs after writing to the file, self-
 * correcting from the reported problems until it passes.
 */
export class ValidateCommand {
	/**
	 * Parses and validates `text`.
	 *
	 * @param text The raw `CHANGELOG.md` contents.
	 * @returns `errors` (must be fixed) and `warnings` (worth fixing); `valid` is true iff `errors` is empty.
	 */
	static validate(text: string): ValidateResult {
		const changelog = ChangelogParser.parse(text);
		const errors: string[] = [];
		const warnings: string[] = [];

		if (changelog.releases.length === 0) {
			errors.push(`no '## [version]' release sections found`);
		}

		ValidateCommand._checkUnreleasedPlacement(changelog.releases, errors);
		ValidateCommand._checkReleases(changelog.releases, errors, warnings);
		ValidateCommand._checkLinkRefs(changelog.releases, changelog.linkRefs, warnings);

		return { valid: errors.length === 0, errors, warnings };
	}

	/**
	 * Checks that at most one `Unreleased` section exists and that it is first when present.
	 *
	 * @param releases The parsed releases, in source order.
	 * @param errors The error list; mutated in place.
	 */
	private static _checkUnreleasedPlacement(releases: ChangelogRelease[], errors: string[]): void {
		const unreleasedIndexes = releases
			.map((release, index) => (release.version === UNRELEASED_VERSION ? index : -1))
			.filter((index) => index !== -1);

		if (unreleasedIndexes.length > 1) {
			errors.push(`found ${unreleasedIndexes.length} 'Unreleased' sections; there must be at most one`);
		}
		if (unreleasedIndexes.length === 1 && unreleasedIndexes[0] !== 0) {
			errors.push(`'Unreleased' section must be the first release section`);
		}
	}

	/**
	 * Checks each release's version format, date, descending order, uniqueness,
	 * and category names/entries.
	 *
	 * @param releases The parsed releases, in source order.
	 * @param errors The error list; mutated in place.
	 * @param warnings The warning list; mutated in place.
	 */
	private static _checkReleases(releases: ChangelogRelease[], errors: string[], warnings: string[]): void {
		const seenVersions = new Set<string>();
		let previousVersion: string | null = null;

		for (const release of releases) {
			const label = `release '${release.version}'`;

			if (seenVersions.has(release.version) === true) {
				errors.push(`${label}: duplicate version`);
			}
			seenVersions.add(release.version);

			if (release.version === UNRELEASED_VERSION) {
				if (release.date !== null) {
					errors.push(`${label}: must not have a date`);
				}
			} else {
				ValidateCommand._checkVersionedRelease(release, label, previousVersion, errors);
				if (VersionSchema.safeParse(release.version).success === true) {
					previousVersion = release.version;
				}
			}

			ValidateCommand._checkCategories(release, label, errors, warnings);
		}
	}

	/**
	 * Checks one numbered (non-Unreleased) release's version format, ordering, and date.
	 *
	 * @param release The release to check.
	 * @param label The `release '<version>'` label to prefix messages with.
	 * @param previousVersion The nearest earlier release's version seen so far, or `null`.
	 * @param errors The error list; mutated in place.
	 */
	private static _checkVersionedRelease(release: ChangelogRelease, label: string, previousVersion: string | null, errors: string[]): void {
		const versionCheck = VersionSchema.safeParse(release.version);
		if (versionCheck.success === false) {
			errors.push(`${label}: ${versionCheck.error.issues[0].message}`);
		} else if (previousVersion !== null && SemverUtils.compare(release.version, previousVersion) >= 0) {
			errors.push(`${label}: must come after '${previousVersion}' in the file (versions must strictly descend)`);
		}

		if (release.date === null) {
			errors.push(`${label}: missing a '- YYYY-MM-DD' date`);
			return;
		}
		const dateCheck = IsoDateSchema.safeParse(release.date);
		if (dateCheck.success === false) {
			errors.push(`${label}: ${dateCheck.error.issues[0].message}`);
		}
	}

	/**
	 * Checks one release's category names and entry text.
	 *
	 * @param release The release to check.
	 * @param label The `release '<version>'` label to prefix messages with.
	 * @param errors The error list; mutated in place.
	 * @param warnings The warning list; mutated in place.
	 */
	private static _checkCategories(release: ChangelogRelease, label: string, errors: string[], warnings: string[]): void {
		for (const [name, entries] of Object.entries(release.categories)) {
			if (CANONICAL_CATEGORIES.includes(name) === false) {
				errors.push(`${label}: unknown category '${name}' (expected one of ${CANONICAL_CATEGORIES.join(', ')})`);
			}
			if (entries.length === 0) {
				warnings.push(`${label}: category '${name}' has no entries`);
				continue;
			}
			for (const entry of entries) {
				const entryCheck = ChangeEntrySchema.safeParse(entry.split('\n')[0]);
				if (entryCheck.success === false) {
					errors.push(`${label}: empty entry under '${name}'`);
				}
			}
		}
	}

	/**
	 * Warns about releases with no corresponding `[version]: url` link reference.
	 *
	 * @param releases The parsed releases.
	 * @param linkRefs The parsed trailing link references.
	 * @param warnings The warning list; mutated in place.
	 */
	private static _checkLinkRefs(releases: ChangelogRelease[], linkRefs: LinkRef[], warnings: string[]): void {
		const labels = new Set(linkRefs.map((ref) => ref.label.toLowerCase()));
		for (const release of releases) {
			if (labels.has(release.version.toLowerCase()) === false) {
				warnings.push(`release '${release.version}': no matching '[${release.version}]: url' link reference`);
			}
		}
	}
}
