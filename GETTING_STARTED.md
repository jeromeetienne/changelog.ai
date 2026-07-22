# Getting Started

`changelog.ai` gives your project a `CHANGELOG.md` that a Claude Code session
keeps up to date for you, in the [Keep a Changelog
1.1.0](https://keepachangelog.com/en/1.1.0/) format. You don't write Markdown
or run commands by hand — you talk to Claude, and it does the work on your
Claude subscription. No OpenAI, no separate API key.

## 1. Prerequisites

- A Claude Code session (claude.ai/code, the CLI, or an IDE extension) open
  in your project.
- Node.js 20.12 or later, only needed to install the skills — Claude runs the
  toolbelt CLI for you afterward.
- Ideally, a git repository with a remote (GitHub or similar). This lets the
  tool auto-generate the version comparison links at the bottom of your
  changelog. Everything still works without one; you just won't get those
  links unless you pass a repo URL yourself later.

## 2. Install the skills into your project

From your project's root:

```bash
npx @jetienne/changelog.ai install .claude --mode copy
```

This copies three Claude Code skills into your project's `.claude/skills/`
folder: `changelog-init`, `changelog-update`, and `changelog-release`. Open
(or reopen) your project in Claude Code and they're available immediately —
nothing else to configure.

To remove them later: `npx @jetienne/changelog.ai uninstall .claude`.

## 3. Create your changelog

In your Claude Code session, just ask:

> Create a changelog for this project.

Claude writes a fresh `CHANGELOG.md` with the standard header and an empty
`Unreleased` section. If your project already has git tags, Claude will offer
to reconstruct past releases from history — say yes or no, your call.

If `CHANGELOG.md` already exists, this step is skipped automatically; Claude
tells you it's already there and points you at the next step instead.

## 4. Log changes as you go

Whenever you've made a change worth telling users about:

> Update the changelog with what I just did.

Claude looks at what changed (your description, or recent commits if you
don't give one), writes a plain-language entry under the right category
(`Added`, `Changed`, `Fixed`, …), and adds it to `Unreleased`. Ask this as
often as you like — already-logged changes won't be duplicated.

You can also point at a specific change directly:

> Add to the changelog: fixed the crash when the export file is empty.

## 5. Cut a release

When you're ready to ship:

> Cut a release.

Claude looks at what's in `Unreleased`, suggests a version number
([semver](https://semver.org/): major for breaking changes, minor for new
features, patch otherwise), confirms it with you, then moves everything into
a dated version section and regenerates the comparison links. It can also
offer to bump your `package.json` version, commit, and tag — but only asks,
never does these silently.

## 6. Use the release notes

> Show me the release notes for 1.4.0.

Claude prints that version's entries — ready to paste into a GitHub release,
a Slack announcement, or a blog post — or you can pipe it directly:

```bash
npx @jetienne/changelog.ai show 1.4.0 | gh release create v1.4.0 -F -
```

## Troubleshooting

- **"CHANGELOG.md already exists"** — you're past step 3; just ask Claude to
  update it instead of creating one.
- **A changelog edit looks wrong** — ask Claude to fix it, or run
  `npx @jetienne/changelog.ai validate` yourself; it lists exactly what's
  non-conformant.
- **No comparison links at the bottom** — the repo URL couldn't be
  auto-detected (no git remote, or not a GitHub-style host). Ask Claude to
  redo the step with a repo URL, e.g. `--repo-url https://github.com/you/your-repo`.

## What's actually happening under the hood

Claude does the reasoning: deciding what's worth logging, how to phrase it,
which version to suggest. A small deterministic CLI
(`npx @jetienne/changelog.ai`) does the mechanical work — parsing, inserting
entries, cutting releases — and validates the result after every change. See
[README.md](README.md) for the full architecture and CLI reference.
