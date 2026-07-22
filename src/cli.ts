#!/usr/bin/env node
// node imports
import Fs from 'node:fs';
import Path from 'node:path';

// npm imports
import { Command } from 'commander';
import Chalk from 'chalk';

// local imports
import { PROJECT_ROOT } from './misc/project_root.js';
import { UtilsIo } from './misc/utils_io.js';
import { GitUtils } from './misc/git_utils.js';
import { CHANGE_CATEGORIES, type ChangeCategory } from './misc/changelog_schemas.js';
import { InitCommand } from './commands/init_command.js';
import { ValidateCommand } from './commands/validate_command.js';
import { AddCommand } from './commands/add_command.js';
import { ReleaseCommand } from './commands/release_command.js';
import { ShowCommand } from './commands/show_command.js';
import { InstallCommand, type InstallMode } from './commands/install_command.js';

/** Default `CHANGELOG.md` path used by every command unless `-i`/`-o` overrides it. */
const DEFAULT_CHANGELOG_PATH = 'CHANGELOG.md';

/** Wire up the subcommands and run them. */
async function main(): Promise<void> {
	const packageJson = JSON.parse(Fs.readFileSync(Path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as { version: string };

	const program = new Command();
	program
		.name('changelog_ai')
		.description('Deterministic toolbelt for the changelog-init / changelog-update / changelog-release Claude skills')
		.version(packageJson.version, '-V, --version', 'output the version number');

	program
		.command('init')
		.description('Write a fresh Keep a Changelog 1.1.0 CHANGELOG.md')
		.option('-o, --output <file>', 'output file', DEFAULT_CHANGELOG_PATH)
		.option('--repo-url <url>', 'repo base URL for future comparison links (auto-detected from the git remote if omitted)')
		.action((options: { output: string; repoUrl?: string }) => {
			if (UtilsIo.exists(options.output) === true) {
				throw new Error(`refusing to overwrite existing file at ${options.output}`);
			}
			const repoUrl = options.repoUrl ?? GitUtils.detectRepoUrl();
			const text = InitCommand.init(repoUrl);
			UtilsIo.writeOutput(options.output, text);
			console.log(Chalk.green(`✓ wrote ${options.output}${repoUrl !== null ? '' : ' (repo URL unknown; pass --repo-url to add comparison links later)'}`));
		});

	program
		.command('validate')
		.description('Check a CHANGELOG.md against the Keep a Changelog 1.1.0 rules; exits non-zero on failure')
		.option('-i, --input <file>', 'input file (or - for stdin)', DEFAULT_CHANGELOG_PATH)
		.action((options: { input: string }) => {
			const text = UtilsIo.readInput(options.input);
			const result = ValidateCommand.validate(text);
			for (const warning of result.warnings) {
				console.warn(Chalk.yellow(`⚠ ${warning}`));
			}
			if (result.valid === true) {
				console.log(Chalk.green(`✓ valid`));
				return;
			}
			console.error(Chalk.red(`✗ invalid (${result.errors.length} problem(s)):`));
			for (const error of result.errors) {
				console.error(Chalk.red(`  - ${error}`));
			}
			process.exit(1);
		});

	program
		.command('add')
		.description('Add one entry under a category in the Unreleased section')
		.requiredOption('-c, --category <name>', `change category (${CHANGE_CATEGORIES.join(', ')})`)
		.requiredOption('-t, --text <entry>', 'the entry text')
		.option('-i, --input <file>', 'input file', DEFAULT_CHANGELOG_PATH)
		.option('-o, --output <file>', 'output file (defaults to overwriting the input file)')
		.action((options: { category: string; text: string; input: string; output?: string }) => {
			const category = requireCategory(options.category);
			const text = UtilsIo.readInput(options.input);
			const updated = AddCommand.add(text, category, options.text);
			UtilsIo.writeOutput(options.output ?? options.input, updated);
			console.log(Chalk.green(`✓ added to '${category}' in Unreleased`));
		});

	program
		.command('release')
		.description('Cut a release: move Unreleased into a new dated version section')
		.argument('<version>', 'the version being released, as MAJOR.MINOR.PATCH')
		.option('--date <date>', 'release date, YYYY-MM-DD (defaults to today)', new Date().toISOString().slice(0, 10))
		.option('--repo-url <url>', 'repo base URL for comparison links (auto-detected from the git remote if omitted)')
		.option('-i, --input <file>', 'input file', DEFAULT_CHANGELOG_PATH)
		.option('-o, --output <file>', 'output file (defaults to overwriting the input file)')
		.action((version: string, options: { date: string; repoUrl?: string; input: string; output?: string }) => {
			const text = UtilsIo.readInput(options.input);
			const repoUrl = options.repoUrl ?? GitUtils.detectRepoUrl();
			const result = ReleaseCommand.release(text, version, options.date, repoUrl);
			UtilsIo.writeOutput(options.output ?? options.input, result.text);
			for (const warning of result.warnings) {
				console.warn(Chalk.yellow(`⚠ ${warning}`));
			}
			console.log(Chalk.green(`✓ released ${version} (${options.date})`));
		});

	program
		.command('show')
		.description("Print one release's body — pipe into e.g. `gh release create -F -`")
		.argument('<version>', "the version to show, or 'unreleased'")
		.option('-i, --input <file>', 'input file', DEFAULT_CHANGELOG_PATH)
		.option('-o, --output <file>', 'output file (or - for stdout)', '-')
		.action((version: string, options: { input: string; output: string }) => {
			const text = UtilsIo.readInput(options.input);
			const body = ShowCommand.show(text, version);
			UtilsIo.writeOutput(options.output, body);
		});

	program
		.command('install')
		.description('Mirror the bundled changelog skills into a target .claude directory')
		.argument('[target]', 'destination .claude directory', '.claude')
		.option('-m, --mode <mode>', 'copy | symlink', 'copy')
		.option('-f, --format <format>', 'markdown | json', 'markdown')
		.action((target: string, options: { mode: string; format: string }) => {
			const mode = requireMode(options.mode);
			const result = InstallCommand.install(target, mode);
			console.log(InstallCommand.formatInstall(result, options.format));
		});

	program
		.command('uninstall')
		.description('Remove the bundled changelog skills from a target .claude directory')
		.argument('[target]', 'destination .claude directory', '.claude')
		.option('-f, --format <format>', 'markdown | json', 'markdown')
		.action((target: string, options: { format: string }) => {
			const result = InstallCommand.uninstall(target);
			console.log(InstallCommand.formatUninstall(result, options.format));
		});

	await program.parseAsync(process.argv);
}

/**
 * Narrows a raw `--category` string to a {@link ChangeCategory}.
 *
 * @param category The category flag value.
 * @returns The validated category.
 * @throws If `category` is not one of {@link CHANGE_CATEGORIES}.
 */
function requireCategory(category: string): ChangeCategory {
	const match = CHANGE_CATEGORIES.find((candidate) => candidate === category);
	if (match === undefined) {
		throw new Error(`unknown category '${category}', expected one of ${CHANGE_CATEGORIES.join(', ')}`);
	}
	return match;
}

/**
 * Narrows a raw `--mode` string to an {@link InstallMode}.
 *
 * @param mode The mode flag value.
 * @returns The validated mode.
 * @throws If `mode` is neither `copy` nor `symlink`.
 */
function requireMode(mode: string): InstallMode {
	if (mode !== 'copy' && mode !== 'symlink') {
		throw new Error(`unknown mode '${mode}', expected 'copy' or 'symlink'`);
	}
	return mode;
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(Chalk.red(`error: ${message}`));
	process.exit(1);
});
