// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { AddCommand } from '../src/commands/add_command.js';
import { ChangelogParser } from '../src/misc/changelog_parser.js';
import { InitCommand } from '../src/commands/init_command.js';

describe('AddCommand.add', () => {
	it('creates the category heading and inserts the entry', () => {
		const before = InitCommand.init(null);
		const after = AddCommand.add(before, 'Added', 'Support exporting to CSV.');
		const changelog = ChangelogParser.parse(after);
		Assert.deepEqual(changelog.releases[0].categories.Added, ['Support exporting to CSV.']);
	});

	it('appends to an existing category rather than duplicating the heading', () => {
		let text = InitCommand.init(null);
		text = AddCommand.add(text, 'Added', 'First entry.');
		text = AddCommand.add(text, 'Added', 'Second entry.');
		const changelog = ChangelogParser.parse(text);
		Assert.deepEqual(changelog.releases[0].categories.Added, ['First entry.', 'Second entry.']);
		Assert.equal((text.match(/### Added/g) ?? []).length, 1);
	});

	it('renders categories in canonical order regardless of insertion order', () => {
		let text = InitCommand.init(null);
		text = AddCommand.add(text, 'Fixed', 'Fixed a crash.');
		text = AddCommand.add(text, 'Added', 'Added a feature.');
		const addedIndex = text.indexOf('### Added');
		const fixedIndex = text.indexOf('### Fixed');
		Assert.ok(addedIndex < fixedIndex);
	});

	it('creates an Unreleased section when none exists yet', () => {
		const noUnreleased = '# Changelog\n\n## [1.0.0] - 2024-01-01\n\n### Added\n\n- Initial release.\n';
		const after = AddCommand.add(noUnreleased, 'Fixed', 'A bugfix.');
		const changelog = ChangelogParser.parse(after);
		Assert.equal(changelog.releases[0].version, 'Unreleased');
		Assert.deepEqual(changelog.releases[0].categories.Fixed, ['A bugfix.']);
		Assert.equal(changelog.releases[1].version, '1.0.0');
	});

	it('rejects an exact duplicate entry under the same category', () => {
		const text = AddCommand.add(InitCommand.init(null), 'Added', 'Same entry.');
		Assert.throws(() => AddCommand.add(text, 'Added', 'Same entry.'), /already listed/);
	});

	it('trims surrounding whitespace before comparing and storing', () => {
		const text = AddCommand.add(InitCommand.init(null), 'Added', '  Padded entry.  ');
		const changelog = ChangelogParser.parse(text);
		Assert.deepEqual(changelog.releases[0].categories.Added, ['Padded entry.']);
	});
});
