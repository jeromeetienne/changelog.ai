---
name: changelog-update
description: >
  Add entries to the Unreleased section of an existing CHANGELOG.md, written
  in human-readable Keep a Changelog style rather than raw commit-log dumps.
  Use this when the user wants to update the changelog, log a change they just
  made, or catch the changelog up with recent commits. Triggers on: "update
  the changelog", "add this to the changelog", "log this change", "update
  CHANGELOG.md". All AI steps run on the current Claude session — no OpenAI,
  no API key.
---

# changelog-update

Add one or more entries to `CHANGELOG.md`'s `Unreleased` section. **You,
Claude, decide what's worth mentioning and how to phrase it** — Keep a
Changelog exists specifically so changelogs read as prose for humans, not as a
dump of `git log`. A small TypeScript toolbelt CLI does the deterministic
insertion and validation.

## The toolbelt CLI

Deterministic operations run through the bundled CLI. In this repo
(development), invoke it from the repo root as:

```bash
npm run changelog_ai -- <command> [args]
```

Once the package is installed, `npx @jetienne/changelog.ai <command>` works the same.

| Command | Purpose |
|---|---|
| `add -c <Category> -t "<entry>"` | Insert one entry under `Unreleased`, creating the category if needed. Errors if the exact same entry is already there. |
| `validate [-i <file>]` | Structurally validate; exits non-zero and lists problems. |

The six categories, in the order they're always rendered: `Added`, `Changed`,
`Deprecated`, `Removed`, `Fixed`, `Security`.

## Steps

1. **Find out what's new.** If the user described a specific change, use
   that. Otherwise inspect recent history:
   - If `CHANGELOG.md` already has released versions, find the latest one and
     run `git log v<latest>..HEAD --oneline` (drop the `v` if the project
     doesn't prefix its tags that way) to see what's landed since.
   - If there's no release yet, look at the last few commits with
     `git log --oneline`, or just ask the user what to log.
2. **Write for the reader, not the log.** For each change worth mentioning:
   - Describe the effect in plain language ("Fixed a crash when the input
     file is empty"), not the commit message or the diff.
   - Skip pure noise (formatting, comment tweaks, internal refactors with no
     user-visible effect) unless the user asks to include it.
   - Pick the right category — a bug fix is `Fixed`, a new capability is
     `Added`, a behavior change to something existing is `Changed`, and so on.
   - Check the existing `Unreleased` entries first so you don't add a
     near-duplicate of something already logged.
3. Add each entry:
   ```bash
   npm run changelog_ai -- add -c Added -t "Support exporting reports to CSV."
   ```
4. **Validate + self-correct** (see below).
5. Summarize what you added (category by category) for the user.

## Validate + self-correct (required after every add)

1. Run `changelog_ai -- validate`.
2. If it exits non-zero, read each reported problem and fix it — for a
   structural problem this usually means the file was hand-edited elsewhere;
   prefer fixing it through the CLI over hand-editing markdown.
3. Repeat until it passes.

## Notes

- If `CHANGELOG.md` doesn't exist yet, stop and point the user at the
  `changelog-init` skill instead.
- Cutting a new version from these entries is the `changelog-release` skill's
  job, not this one's.
