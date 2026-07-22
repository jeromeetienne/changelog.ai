---
name: changelog-release
description: >
  Make a new release in CHANGELOG.md: move the Unreleased entries into a dated
  version section and regenerate the comparison links. Use this when the user
  wants to make a release, bump the version, or prepare release notes.
  Triggers on: "make a release", "release version X", "bump the version",
  "prepare a release". All AI steps run on the current Claude session — no
  OpenAI, no API key.
---

# changelog-release

Move `CHANGELOG.md`'s `Unreleased` section into a new dated `## [X.Y.Z] -
YYYY-MM-DD` section, leave a fresh empty `Unreleased` behind, and regenerate
every version's comparison link. **You, Claude, decide the version number**
(unless the user gave one) by reading what's actually in `Unreleased`; the CLI
does the mechanical move and link regeneration.

## The toolbelt CLI

Deterministic operations run through the bundled CLI:

```bash
npx @jetienne/changelog.ai <command> [args]
```

| Command | Purpose |
|---|---|
| `validate [-i <file>]` | Structurally validate before releasing; exits non-zero and lists problems. |
| `release <version> [--date YYYY-MM-DD] [--repo-url <url>]` | Cut the release. Defaults `--date` to today and auto-detects `--repo-url` from the git remote. Errors if `Unreleased` is empty, the version isn't `MAJOR.MINOR.PATCH`, it already exists, or it isn't greater than the latest released version. |
| `show <version\|unreleased>` | Print a release's body — pipe straight into `gh release create -F -` for the release notes. |

## Steps

1. Run `npx @jetienne/changelog.ai validate` first — fix any problems before releasing.
2. **Determine the version.** If the user gave one, use it. Otherwise look at
   what's in `Unreleased` and suggest a [Semantic Versioning](https://semver.org/)
   bump:
   - Any `Removed` entry, or wording that says something breaks → **major**.
   - Any `Added` entry (and nothing breaking) → **minor**.
   - Only `Fixed`/`Security`/other non-breaking entries → **patch**.
   State your reasoning and confirm the version with the user before cutting
   anything — don't guess silently.
3. Cut the release:
   ```bash
   npx @jetienne/changelog.ai release 1.4.0
   ```
   (Add `--date YYYY-MM-DD` to backdate it, e.g. when reconstructing history.)
4. **Validate + self-correct** (see below).
5. **Optional, and only with explicit confirmation for each:**
   - Sync the version in `package.json` (or the project's equivalent) to
     match.
   - `git add CHANGELOG.md` (and the version file, if synced) and commit.
   - `git tag v1.4.0` (matching the `v`-prefixed tags the comparison links
     assume).
   Never commit, tag, or push without the user confirming first.
6. Print the release notes:
   ```bash
   npx @jetienne/changelog.ai show 1.4.0
   ```
   and offer to use them as-is for `gh release create -F -` or a similar
   release note post — but only publish/push if the user asks you to.

## Validate + self-correct (required after cutting the release)

1. Run `npx @jetienne/changelog.ai validate`.
2. If it exits non-zero, read each reported problem and fix it.
3. Repeat until it passes.

## Notes

- If there's no `CHANGELOG.md` yet, point the user at `changelog-init`. If
  `Unreleased` is empty, point them at `changelog-update` first — there's
  nothing to release.
- If the repo URL can't be auto-detected and isn't passed explicitly, the
  release still gets cut, but its comparison link won't be generated;
  `npx @jetienne/changelog.ai` says so in a warning.
