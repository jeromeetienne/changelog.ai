// local imports
import { ChangelogSerializer } from '../misc/changelog_serializer.js';
import { UNRELEASED_VERSION, type Changelog } from '../misc/changelog_schemas.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Init Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The Keep a Changelog 1.1.0 recommended header, verbatim from https://keepachangelog.com/en/1.1.0/. */
const PREAMBLE = [
	'All notable changes to this project will be documented in this file.',
	'',
	'The format is based on [Keep a Changelog](https://keepachangelog.com/),',
	'and this project adheres to [Semantic Versioning](https://semver.org/).',
].join('\n');

/** Builds a fresh, empty Keep a Changelog 1.1.0 skeleton. */
export class InitCommand {
	/**
	 * Builds a new `CHANGELOG.md`: the standard header, and an empty `Unreleased`
	 * section. Whether an `[Unreleased]` comparison link is emitted follows the
	 * usual serializer rule (only once a version has actually been released).
	 *
	 * @param repoUrl The repo's base URL for future comparison links, or `null` if unknown.
	 * @returns The new file's full text.
	 */
	static init(repoUrl: string | null): string {
		const changelog: Changelog = {
			title: 'Changelog',
			preamble: PREAMBLE,
			releases: [{ version: UNRELEASED_VERSION, date: null, isYanked: false, description: null, categories: {} }],
			linkRefs: [],
		};
		return ChangelogSerializer.serialize(changelog, { repoUrl });
	}
}
