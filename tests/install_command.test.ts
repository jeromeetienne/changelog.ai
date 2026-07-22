// node imports
import { describe, it } from 'node:test';
import Assert from 'node:assert/strict';
import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';

// local imports
import { InstallCommand } from '../src/commands/install_command.js';

const SKILL_REL = Path.join('skills', 'changelog-init', 'SKILL.md');

/**
 * Creates a temp dir with symlinks resolved. On macOS `os.tmpdir()` sits under
 * `/var` (a symlink to `/private/var`), which would break the relative symlinks
 * `install --mode symlink` writes; real `.claude` targets share the repo's tree.
 */
function makeTempDir(): string {
	return Fs.realpathSync(Fs.mkdtempSync(Path.join(Os.tmpdir(), 'changelog-ai-')));
}

describe('InstallCommand', () => {
	it('copies the bundled skills into a target, then uninstalls them', () => {
		const dir = makeTempDir();
		try {
			const installed = InstallCommand.install(dir, 'copy');
			Assert.equal(installed.mode, 'copy');
			Assert.ok(installed.claude.installed.includes(SKILL_REL));
			Assert.equal(Fs.existsSync(Path.join(dir, SKILL_REL)), true);
			Assert.equal(Fs.lstatSync(Path.join(dir, SKILL_REL)).isFile(), true);

			const removed = InstallCommand.uninstall(dir);
			Assert.deepEqual(removed.removed.sort(), installed.claude.installed.sort());
			Assert.equal(Fs.existsSync(Path.join(dir, SKILL_REL)), false);
		} finally {
			Fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('symlinks the bundled skills back to the source', () => {
		const dir = makeTempDir();
		try {
			const installed = InstallCommand.install(dir, 'symlink');
			Assert.equal(installed.mode, 'symlink');
			const target = Path.join(dir, SKILL_REL);
			Assert.equal(Fs.lstatSync(target).isSymbolicLink(), true);
			Assert.equal(Fs.existsSync(target), true);
		} finally {
			Fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('renders a json install summary', () => {
		const dir = makeTempDir();
		try {
			const result = InstallCommand.install(dir, 'copy');
			const parsed = JSON.parse(InstallCommand.formatInstall(result, 'json')) as { mode: string };
			Assert.equal(parsed.mode, 'copy');
			Assert.throws(() => InstallCommand.formatInstall(result, 'yaml'));
		} finally {
			Fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
