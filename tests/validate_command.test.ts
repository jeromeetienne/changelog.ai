// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';

// local imports
import { ValidateCommand } from '../src/commands/validate_command.js';

/** Joins lines with a trailing newline, so each fixture below reads like a real file. */
function md(...lines: string[]): string {
	return `${lines.join('\n')}\n`;
}

describe('ValidateCommand.validate', () => {
	it('accepts a fully conformant changelog with no errors or warnings', () => {
		const text = md(
			'# Changelog',
			'',
			'## [Unreleased]',
			'',
			'### Added',
			'',
			'- Something new.',
			'',
			'## [1.0.0] - 2024-01-01',
			'',
			'### Added',
			'',
			'- Initial release.',
			'',
			'[Unreleased]: https://example.com/compare/v1.0.0...HEAD',
			'[1.0.0]: https://example.com/releases/tag/v1.0.0',
		);
		const result = ValidateCommand.validate(text);
		Assert.deepEqual(result, { valid: true, errors: [], warnings: [] });
	});

	it('flags a duplicate version', () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-01-01', '### Added', '- A.', '', '## [1.0.0] - 2024-02-01', '### Added', '- B.');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes('duplicate version')));
	});

	it('flags versions out of descending order', () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-01-01', '### Added', '- A.', '', '## [2.0.0] - 2024-02-01', '### Added', '- B.');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes('must come after')));
	});

	it('flags an invalid calendar date', () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-13-40', '### Added', '- A.');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes('calendar date')));
	});

	it('flags an unrecognized category heading', () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-01-01', '### Improved', '- A.');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes("unknown category 'Improved'")));
	});

	it("flags 'Unreleased' carrying a date", () => {
		const text = md('# Changelog', '', '## [Unreleased] - 2024-01-01');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes('must not have a date')));
	});

	it("flags 'Unreleased' when it is not the first section", () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-01-01', '### Added', '- A.', '', '## [Unreleased]');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, false);
		Assert.ok(result.errors.some((error) => error.includes('must be the first release section')));
	});

	it('warns (without failing) on an empty category and a missing link reference', () => {
		const text = md('# Changelog', '', '## [1.0.0] - 2024-01-01', '### Added');
		const result = ValidateCommand.validate(text);
		Assert.equal(result.valid, true);
		Assert.ok(result.warnings.some((warning) => warning.includes("category 'Added' has no entries")));
		Assert.ok(result.warnings.some((warning) => warning.includes('no matching')));
	});
});
