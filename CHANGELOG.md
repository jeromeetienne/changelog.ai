# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Add the `changelog_ai` CLI toolbelt (`init`, `validate`, `add`, `release`, `show`, `install`, `uninstall`) for creating and maintaining a CHANGELOG.md in Keep a Changelog 1.1.0 format.
- Add three Claude Code skills — `changelog-init`, `changelog-update`, `changelog-release` — that drive the CLI from plain-English requests.
- Auto-detect the repository's GitHub URL from the git remote to generate version comparison links.
