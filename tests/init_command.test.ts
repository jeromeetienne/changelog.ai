// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { InitCommand } from '../src/commands/init_command.js';
import { ValidateCommand } from '../src/commands/validate_command.js';
import { ChangelogParser } from '../src/misc/changelog_parser.js';

describe('InitCommand.init', () => {
	it('writes a valid, empty Keep a Changelog skeleton', () => {
		const text = InitCommand.init(null);
		const changelog = ChangelogParser.parse(text);

		Assert.equal(changelog.title, 'Changelog');
		Assert.equal(changelog.releases.length, 1);
		Assert.equal(changelog.releases[0].version, 'Unreleased');
		Assert.deepEqual(changelog.releases[0].categories, {});
		Assert.equal(ValidateCommand.validate(text).valid, true);
	});

	it('does not fabricate an Unreleased comparison link before any version has been released', () => {
		const text = InitCommand.init('https://github.com/owner/repo');
		Assert.equal(text.includes('[Unreleased]:'), false);
	});
});
