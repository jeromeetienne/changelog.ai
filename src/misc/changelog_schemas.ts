// npm imports
import { z } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Changelog Schemas — Keep a Changelog 1.1.0 data model and field validators
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The six change categories defined by Keep a Changelog 1.1.0, in canonical display order. */
export const CHANGE_CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'] as const;

/** One of the six canonical Keep a Changelog change categories. */
export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

/** Literal version token used for the unreleased section heading. */
export const UNRELEASED_VERSION = 'Unreleased';

/** Strict `MAJOR.MINOR.PATCH` semantic version, no pre-release or build metadata. */
export const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/** ISO 8601 calendar date (`YYYY-MM-DD`). */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A single verbatim link-reference definition line (`[label]: url`) preserved from the source file. */
export type LinkRef = {
	label: string;
	url: string;
};

/**
 * One version section of a changelog: `Unreleased` or a released version, its
 * date, whether it was yanked, any free-form prose before its first category,
 * and its changes grouped by category. Each bullet string holds a category
 * entry's full raw text, including any wrapped or nested continuation lines.
 * Category keys are not restricted to {@link CHANGE_CATEGORIES} at parse time
 * so an unrecognized heading is preserved rather than silently dropped;
 * `validate` is what flags it.
 */
export type ChangelogRelease = {
	version: string;
	date: string | null;
	isYanked: boolean;
	description: string | null;
	categories: Record<string, string[]>;
};

/** The full parsed contents of a `CHANGELOG.md` file. */
export type Changelog = {
	title: string;
	preamble: string;
	releases: ChangelogRelease[];
	linkRefs: LinkRef[];
};

/** Zod schema for a single change entry: non-empty, trimmed text. */
export const ChangeEntrySchema = z.string().trim().min(1, 'entry text must not be empty');

/** Zod schema validating a version token is `Unreleased` or strict semver. */
export const VersionSchema = z.string().refine(
	(value) => value === UNRELEASED_VERSION || SEMVER_PATTERN.test(value),
	(value) => ({ message: `'${value}' is not 'Unreleased' or a MAJOR.MINOR.PATCH version` }),
);

/** Zod schema validating an ISO 8601 date string represents a real calendar date. */
export const IsoDateSchema = z
	.string()
	.regex(ISO_DATE_PATTERN, 'date must be in YYYY-MM-DD format')
	.refine((value) => {
		const [year, month, day] = value.split('-').map(Number);
		const date = new Date(Date.UTC(year, month - 1, day));
		return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
	}, 'date is not a real calendar date');
