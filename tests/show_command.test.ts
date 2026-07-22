// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { ShowCommand } from '../src/commands/show_command.js';
import { ReleaseCommand } from '../src/commands/release_command.js';
import { AddCommand } from '../src/commands/add_command.js';
import { InitCommand } from '../src/commands/init_command.js';

describe('ShowCommand.show', () => {
	const released = ReleaseCommand.release(AddCommand.add(InitCommand.init(null), 'Added', 'Support exporting to CSV.'), '1.0.0', '2024-01-01', null).text;
	const withNewUnreleased = AddCommand.add(released, 'Fixed', 'A follow-up fix.');

	it('renders a released version body without its heading', () => {
		Assert.equal(ShowCommand.show(withNewUnreleased, '1.0.0'), '### Added\n\n- Support exporting to CSV.');
	});

	it("matches 'unreleased' case-insensitively", () => {
		Assert.equal(ShowCommand.show(withNewUnreleased, 'unreleased'), '### Fixed\n\n- A follow-up fix.');
		Assert.equal(ShowCommand.show(withNewUnreleased, 'Unreleased'), ShowCommand.show(withNewUnreleased, 'unreleased'));
	});

	it('throws a helpful error listing known versions when the version is missing', () => {
		Assert.throws(() => ShowCommand.show(withNewUnreleased, '9.9.9'), /no release '9\.9\.9' found \(known: Unreleased, 1\.0\.0\)/);
	});
});
