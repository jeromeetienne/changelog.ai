// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';
import Fs from 'node:fs';
import Path from 'node:path';
import Url from 'node:url';

// local imports
import { ChangelogParser } from '../src/misc/changelog_parser.js';
import { ChangelogSerializer } from '../src/misc/changelog_serializer.js';

const PROJECT_ROOT = Path.resolve(Path.dirname(Url.fileURLToPath(import.meta.url)), '..');
const SAMPLE_PATH = Path.join(PROJECT_ROOT, 'data', 'CHANGELOG.sample.md');
const REAL_WORLD_PATH = Path.join(PROJECT_ROOT, 'tests', 'fixtures', 'CHANGELOG.real-world.md');

describe('ChangelogSerializer.serialize (round trip on the real keepachangelog.com sample)', () => {
	const original = Fs.readFileSync(SAMPLE_PATH, 'utf8');

	it('reproduces the source file byte-for-byte with no repoUrl (verbatim link passthrough)', () => {
		const changelog = ChangelogParser.parse(original);
		const serialized = ChangelogSerializer.serialize(changelog);
		Assert.equal(serialized, original);
	});

	it('regenerates the exact same version links when given the real repoUrl', () => {
		const changelog = ChangelogParser.parse(original);
		const serialized = ChangelogSerializer.serialize(changelog, { repoUrl: 'https://github.com/olivierlacan/keep-a-changelog' });
		Assert.ok(serialized.includes('[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.3.0...HEAD'));
		Assert.ok(serialized.includes('[0.3.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.2.0...v0.3.0'));
		Assert.ok(serialized.includes('[0.1.0]: https://github.com/olivierlacan/keep-a-changelog/releases/tag/v0.1.0'));
		Assert.ok(serialized.includes('[SemVer]: https://semver.org'));
	});

	it('is stable under a second parse -> serialize pass', () => {
		const once = ChangelogSerializer.serialize(ChangelogParser.parse(original));
		const twice = ChangelogSerializer.serialize(ChangelogParser.parse(once));
		Assert.equal(twice, once);
	});
});

describe('ChangelogSerializer.serialize (stability on the full real-world keepachangelog.com CHANGELOG.md)', () => {
	const original = Fs.readFileSync(REAL_WORLD_PATH, 'utf8');

	it('reaches a fixed point after one parse -> serialize -> parse -> serialize cycle', () => {
		const once = ChangelogSerializer.serialize(ChangelogParser.parse(original));
		const twice = ChangelogSerializer.serialize(ChangelogParser.parse(once));
		Assert.equal(twice, once);
	});

	it('preserves every release version through the round trip, in order', () => {
		const before = ChangelogParser.parse(original).releases.map((release) => release.version);
		const after = ChangelogParser.parse(ChangelogSerializer.serialize(ChangelogParser.parse(original))).releases.map(
			(release) => release.version,
		);
		Assert.deepEqual(after, before);
	});
});
