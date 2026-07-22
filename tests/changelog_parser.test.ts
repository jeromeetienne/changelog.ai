// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';
import Fs from 'node:fs';
import Path from 'node:path';
import Url from 'node:url';

// local imports
import { ChangelogParser } from '../src/misc/changelog_parser.js';

const PROJECT_ROOT = Path.resolve(Path.dirname(Url.fileURLToPath(import.meta.url)), '..');
const SAMPLE_PATH = Path.join(PROJECT_ROOT, 'data', 'CHANGELOG.sample.md');
const REAL_WORLD_PATH = Path.join(PROJECT_ROOT, 'tests', 'fixtures', 'CHANGELOG.real-world.md');

describe('ChangelogParser.parse (real keepachangelog.com sample, 3 releases)', () => {
	const changelog = ChangelogParser.parse(Fs.readFileSync(SAMPLE_PATH, 'utf8'));

	it('parses the title and preamble', () => {
		Assert.equal(changelog.title, 'Changelog');
		Assert.ok(changelog.preamble.includes('Keep a Changelog'));
		Assert.ok(changelog.preamble.includes('Semantic Versioning'));
	});

	it('parses an empty Unreleased section first', () => {
		Assert.equal(changelog.releases.length, 4);
		Assert.equal(changelog.releases[0].version, 'Unreleased');
		Assert.equal(changelog.releases[0].date, null);
		Assert.deepEqual(changelog.releases[0].categories, {});
	});

	it('parses a dated release with one category', () => {
		const release = changelog.releases[1];
		Assert.equal(release.version, '0.3.0');
		Assert.equal(release.date, '2015-12-03');
		Assert.equal(release.isYanked, false);
		Assert.deepEqual(release.categories.Added, [
			'RU translation from [@aishek].',
			'pt-BR translation from [@tallesl].',
			'es-ES translation from [@ZeliosAriex].',
		]);
	});

	it('parses a release with multiple categories, in source order', () => {
		const release = changelog.releases[3];
		Assert.equal(release.version, '0.1.0');
		Assert.deepEqual(Object.keys(release.categories), ['Added', 'Changed']);
		Assert.deepEqual(release.categories.Changed, ['Improve argument against commit logs.', 'Start following [SemVer] properly.']);
	});

	it('parses the trailing link references, including a non-version one', () => {
		Assert.ok(changelog.linkRefs.some((ref) => ref.label === '0.3.0' && ref.url.includes('compare/v0.2.0...v0.3.0')));
		Assert.ok(changelog.linkRefs.some((ref) => ref.label === 'SemVer' && ref.url === 'https://semver.org'));
	});
});

describe('ChangelogParser.parse (full real-world keepachangelog.com CHANGELOG.md, 17 releases)', () => {
	const changelog = ChangelogParser.parse(Fs.readFileSync(REAL_WORLD_PATH, 'utf8'));

	it('does not throw and finds every release heading', () => {
		Assert.equal(changelog.releases.length, 17);
		Assert.equal(changelog.releases[0].version, 'Unreleased');
		Assert.equal(changelog.releases[1].version, '2.0.0');
		Assert.equal(changelog.releases[1].date, '2026-06-07');
		Assert.equal(changelog.releases[16].version, '0.0.1');
		Assert.equal(changelog.releases[16].date, '2014-05-31');
	});

	it('captures the free-form prose between a version heading and its first category', () => {
		const release = changelog.releases[1];
		Assert.ok(release.description !== null);
		Assert.ok(release.description?.includes('first major revision of Keep a Changelog'));
	});

	it('captures a multi-line bullet, including its nested sub-list, as one entry', () => {
		const release = changelog.releases[1];
		const entry = release.categories.Added?.find((text) => text.startsWith('New guidance answering'));
		Assert.ok(entry !== undefined);
		Assert.ok(entry?.includes('\n'));
		Assert.ok(entry?.includes('Format:'));
		Assert.ok(entry?.includes('leading a Security entry with its CVE'));
	});

	it('captures a line-wrapped bullet as one entry with an embedded newline', () => {
		const release = changelog.releases.find((entry) => entry.version === '1.1.1');
		const entry = release?.categories.Added?.find((text) => text.startsWith('Default to most recent versions'));
		Assert.ok(entry !== undefined);
	});

	it('parses non-version link references (an @username credit) without dropping them', () => {
		Assert.ok(changelog.linkRefs.some((ref) => ref.label === '@tylerfortune8' && ref.url === 'https://github.com/tylerfortune8'));
		Assert.ok(changelog.linkRefs.some((ref) => ref.label === 'unreleased'));
	});
});
