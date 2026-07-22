# changelog.ai

Create and maintain a project's **CHANGELOG.md** in the [Keep a Changelog
1.1.0](https://keepachangelog.com/en/1.1.0/) format — delivered as **Claude
Code skills** that run on your Claude subscription. No OpenAI, no metered API
key: the reasoning is Claude itself, in your session; a small TypeScript
toolbelt CLI does the deterministic work.

New here? See [GETTING_STARTED.md](GETTING_STARTED.md) for a step-by-step
walkthrough.

## Architecture

- **Interface** — Claude skills in `dotclaude_folder/skills/`, mirrored into
  `.claude/` (and installable into any project). **This is what you use** —
  you talk to Claude, not to the CLI.
- **Reasoning** — performed by Claude in-session, guided by each skill's
  `SKILL.md`: deciding what's worth logging, phrasing entries for humans (not
  raw commit-log dumps), picking a category, suggesting the next semver bump.
- **Deterministic work** — a Commander CLI (`src/cli.ts`) the skills call for
  scaffolding, parsing, validating, inserting entries, and cutting releases.

Every mutation goes parse → modify the in-memory model → serialize, so
`CHANGELOG.md` never drifts from canonical Keep a Changelog form. After every
AI-driven edit the agent runs `validate` and self-corrects — schema-checked
output without a structured-output API.

## Skills

| Skill | Capabilities |
|---|---|
| `changelog-init` | Create a fresh `CHANGELOG.md`; optional backfill from git history |
| `changelog-update` | Add human-readable entries to `Unreleased` from recent commits or a described change |
| `changelog-release` | Cut a release: move `Unreleased` into a dated version section, regenerate comparison links |

## Using it — the workflow

**You don't run the CLI.** You open a Claude Code session and ask in plain
English; the skills trigger on what you say, do the work on your
subscription, and write `CHANGELOG.md` as they go.

### 1. Enable the skills

```bash
# in this repo
npm install
npm run install:dotclaude     # symlinks all three skills into ./.claude/
# …then open this repo in Claude Code — changelog-init/update/release load automatically
```

To add the skills to a different project instead:

```bash
npx @jetienne/changelog.ai install /path/to/project/.claude --mode copy
```

### 2. Start a changelog

> **Create a changelog for this project.**

`changelog-init` writes the standard header and an empty `Unreleased`
section, auto-detecting the repo's URL from `git remote` for later comparison
links. If the project has git tags, it can optionally offer to reconstruct
past releases from history — only with your confirmation.

### 3. Keep it updated

> **Update the changelog with what I just did.**

`changelog-update` looks at recent commits (or the change you describe),
writes plain-language entries under the right category, and validates the
result:

```markdown
## [Unreleased]

### Added

- Support exporting reports to CSV.

### Fixed

- Crash when the input file is empty.
```

### 4. Cut a release

> **Cut a release.**

`changelog-release` reads what's in `Unreleased`, suggests the next
[semver](https://semver.org/) version (major for breaking/`Removed`, minor
for `Added`, patch otherwise), confirms it with you, then moves everything
into a dated section and regenerates every comparison link:

```markdown
## [1.4.0] - 2026-07-22

### Added

- Support exporting reports to CSV.

### Fixed

- Crash when the input file is empty.

[1.4.0]: https://github.com/owner/repo/compare/v1.3.0...v1.4.0
```

It can optionally sync `package.json`'s version, commit, and tag — always
asking first — and print the release body ready to pipe into
`gh release create -F -`.

## Under the hood — the toolbelt CLI

The skills call this CLI for the deterministic, non-AI work. You rarely run it
by hand, but it's a normal Commander CLI:

```bash
npx @jetienne/changelog.ai init                                  # scaffold a fresh CHANGELOG.md
npx @jetienne/changelog.ai validate                              # check it; exits non-zero and lists problems
npx @jetienne/changelog.ai add -c Added -t "New --verbose flag." # insert one entry under Unreleased
npx @jetienne/changelog.ai release 1.4.0                         # cut a release from Unreleased
npx @jetienne/changelog.ai show 1.4.0                            # print a release's body (or "unreleased")
npx @jetienne/changelog.ai install .claude --mode symlink        # mirror the skills into .claude/ (uninstall to remove)
```

`validate` is the gate the skills run after every edit; every command reads
and writes plain `CHANGELOG.md` text, so it composes with `-i -`/`-o -` in a
shell pipeline.

## Development

```bash
npm run typecheck     # tsc --noEmit
npm test              # node --test on tests/**/*.test.ts
npm run build         # tsc -p tsconfig.build.json  ->  dist/
```

## License

MIT
