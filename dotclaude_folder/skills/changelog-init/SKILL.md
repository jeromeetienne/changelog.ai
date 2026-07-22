---
name: changelog-init
description: >
  Create a new CHANGELOG.md in the Keep a Changelog 1.1.0 format. Use this
  when the user wants to add a changelog to a project that does not have one
  yet, or asks to start tracking changes. Triggers on: "create a changelog",
  "add a CHANGELOG.md", "start a changelog for this project", "set up a
  changelog". If a CHANGELOG.md already exists, this skill stops and points at
  the sibling changelog-update skill instead. All AI steps run on the current
  Claude session — no OpenAI, no API key.
---

# changelog-init

Create a new `CHANGELOG.md` following [Keep a Changelog
1.1.0](https://keepachangelog.com/en/1.1.0/): a title, a preamble, an empty
`Unreleased` section, and (once versions exist) comparison links at the
bottom. A small TypeScript toolbelt CLI does the deterministic work; you do
the judgment calls (whether to overwrite, whether to backfill history).

## The toolbelt CLI

Deterministic operations run through the bundled CLI. In this repo
(development), invoke it from the repo root as:

```bash
npm run changelog_ai -- <command> [args]
```

Once the package is installed, `npx @jetienne/changelog.ai <command>` works the same.

| Command | Purpose |
|---|---|
| `init [-o <file>] [--repo-url <url>]` | Write the skeleton. Refuses to overwrite an existing file. Repo URL is auto-detected from the git remote if omitted. |
| `validate [-i <file>]` | Structurally validate a `CHANGELOG.md`; exits non-zero and lists problems on failure. |
| `add -c <Category> -t "<entry>"` | Add one entry under `Unreleased` (used for the optional backfill below). |

## Steps

1. **Check first.** If `CHANGELOG.md` already exists in the project root, stop
   and tell the user — point them at the `changelog-update` skill instead.
   Never overwrite an existing changelog.
2. Run:
   ```bash
   npm run changelog_ai -- init
   ```
   This writes the standard header and an empty `Unreleased` section, and
   picks up the repo's GitHub URL automatically from `git remote` if there is
   one.
3. **Validate + self-correct** (see below).
4. **Optional backfill (AI, you).** If the project has git history or tags,
   offer to reconstruct past releases from it:
   - `git tag` / `git log --oneline` to see what versions and commits exist.
   - For each past tag (oldest first), read the commits since the previous
     tag and write human-readable entries — not raw commit messages — using
     `add -c <Category> -t "<entry>"` for the *current* Unreleased section,
     then follow the `changelog-release` skill's approach to cut that version
     with the tag's actual date. Only do this if the user confirms they want
     history backfilled; it's easy to get wrong on a messy git history, so say
     what you're inferring and let the user correct it.
   - If the user just wants an empty changelog to start from now, skip this
     step entirely.

## Validate + self-correct (required after every AI-driven edit)

1. Run `changelog_ai -- validate`.
2. If it exits non-zero, read each reported problem (one per line) and fix the
   file — or better, redo the edit through `add`/`release` rather than
   hand-editing markdown, since those commands can't produce invalid output.
3. Repeat until it passes. Only then summarize for the user what was created
   (and, if backfilled, how many past versions).

## Notes

- Never fabricate release history. If you can't tell what changed in a past
  version, say so rather than guessing.
- Ongoing updates after this point are the `changelog-update` skill's job;
  cutting a new release is the `changelog-release` skill's job.
