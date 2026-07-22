# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- GETTING_STARTED.md guide for new users, linked from the README

### Changed

- Renamed "cut a release" to "make a release" throughout the documentation and CLI for consistency

## [0.1.5] - 2026-07-22

### Changed

- Renamed the npm package to @jetienne/changelog.ai — the unscoped name was rejected by npm as too similar to an existing package

## [0.1.1] - 2026-07-22

### Added

- changelog_ai CLI with init, validate, add, release, show, install, and uninstall commands for maintaining a CHANGELOG.md in the Keep a Changelog 1.1.0 format
- Three Claude Code skills — changelog-init, changelog-update, and changelog-release — that drive the CLI from a Claude Code session

[Unreleased]: https://github.com/jeromeetienne/changelog.ai/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/jeromeetienne/changelog.ai/compare/v0.1.1...v0.1.5
[0.1.1]: https://github.com/jeromeetienne/changelog.ai/releases/tag/v0.1.1
