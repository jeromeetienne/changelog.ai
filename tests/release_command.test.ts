// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { ReleaseCommand } from '../src/commands/release_command.js';
import { AddCommand } from '../src/commands/add_command.js';
import { InitCommand } from '../src/commands/init_command.js';
import { ChangelogParser } from '../src/misc/changelog_parser.js';

/** A fresh changelog with one Unreleased entry, ready to release. */
function withOneUnreleasedEntry(): string {
	return AddCommand.add(InitCommand.init(null), 'Added', 'Support exporting to CSV.');
}

describe('ReleaseCommand.release', () => {
	it('moves Unreleased content into a new dated section and leaves a fresh Unreleased', () => {
		const result = ReleaseCommand.release(withOneUnreleasedEntry(), '1.0.0', '2024-01-01', null);
		const changelog = ChangelogParser.parse(result.text);

		Assert.equal(changelog.releases[0].version, 'Unreleased');
		Assert.deepEqual(changelog.releases[0].categories, {});
		Assert.equal(changelog.releases[1].version, '1.0.0');
		Assert.equal(changelog.releases[1].date, '2024-01-01');
		Assert.deepEqual(changelog.releases[1].categories.Added, ['Support exporting to CSV.']);
	});

	it('warns but still succeeds when the repo URL is unknown', () => {
		const result = ReleaseCommand.release(withOneUnreleasedEntry(), '1.0.0', '2024-01-01', null);
		Assert.ok(result.warnings.some((warning) => warning.includes('repo URL is unknown')));
	});

	it('regenerates comparison links when the repo URL is known', () => {
		const result = ReleaseCommand.release(withOneUnreleasedEntry(), '1.0.0', '2024-01-01', 'https://github.com/owner/repo');
		Assert.deepEqual(result.warnings, []);
		Assert.ok(result.text.includes('[1.0.0]: https://github.com/owner/repo/releases/tag/v1.0.0'));
	});

	it('rejects a version that is not MAJOR.MINOR.PATCH', () => {
		Assert.throws(() => ReleaseCommand.release(withOneUnreleasedEntry(), '1.0', '2024-01-01', null), /not a MAJOR\.MINOR\.PATCH version/);
	});

	it('rejects a malformed date', () => {
		Assert.throws(() => ReleaseCommand.release(withOneUnreleasedEntry(), '1.0.0', '2024-13-40', null), /calendar date/);
	});

	it('rejects releasing when Unreleased has no content', () => {
		Assert.throws(() => ReleaseCommand.release(InitCommand.init(null), '1.0.0', '2024-01-01', null), /no content to release/);
	});

	it('rejects releasing when there is no Unreleased section at all', () => {
		const noUnreleased = '# Changelog\n\n## [1.0.0] - 2024-01-01\n\n### Added\n\n- Initial release.\n';
		Assert.throws(() => ReleaseCommand.release(noUnreleased, '2.0.0', '2024-01-01', null), /no 'Unreleased' section/);
	});

	it('rejects a version that already exists', () => {
		const released = ReleaseCommand.release(withOneUnreleasedEntry(), '1.0.0', '2024-01-01', null).text;
		const withNewEntry = AddCommand.add(released, 'Fixed', 'Another fix.');
		Assert.throws(() => ReleaseCommand.release(withNewEntry, '1.0.0', '2024-02-01', null), /already exists/);
	});

	it('rejects a version not greater than the latest released version', () => {
		const released = ReleaseCommand.release(withOneUnreleasedEntry(), '2.0.0', '2024-01-01', null).text;
		const withNewEntry = AddCommand.add(released, 'Fixed', 'Another fix.');
		Assert.throws(() => ReleaseCommand.release(withNewEntry, '1.5.0', '2024-02-01', null), /must be greater than the latest released version '2\.0\.0'/);
	});
});
