# Change Log

All notable changes to the "npm quick" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org).

## [0.0.7] - 2026-02-07

### Added
- Script icons based on script type for improved visual identification
- Script type detection system with automatic categorization:
  - 🧪 Test: test, spec, jest, vitest
  - ⚙️ Build: build, bundle, pack, compile
  - ▶️ Dev: dev, start, serve
  - ✓ Lint: lint, eslint
  - ✏️ Format: format, prettier
  - ☁️ Deploy: deploy, publish, release
  - 📖 Docs: doc, docs, jsdoc
  - ▶️ Other: scripts not matching above categories
- Marketplace URL badge and installation link in README
- New `scriptIcons.ts` module for icon management

### Improved
- Enhanced UX with visual script type indicators in QuickPick

## [0.0.6] - 2026-02-06

### Fixed
- Keybinding activation for script execution command

## [0.0.5] - 2026-02-05

### Changed
- Updated keybinding from `Cmd+Shift+R` to `Cmd+Alt+N` (macOS) / `Ctrl+Alt+N` (Windows/Linux)
- Bumped version for marketplace alignment

## [0.0.4] - 2026-02-04

### Added
- Changelog documentation

## [0.0.3] - 2026-02-03

### Added
- Keyboard shortcut support with `Cmd+Shift+R` for running scripts

### Documentation
- Added signed commits requirement to contributing guidelines
- Improved documentation and fixed command consistency

## [0.0.2] - 2026-02-02

### Changed
- Renamed extension from "task-executor" to "npm quick"
- Updated branding and naming throughout the project

### Added
- Extension icon (PNG format) for marketplace publishing
- Comprehensive documentation with guides
- Enhanced README with usage examples

### Improved
- Cleanup of unnecessary files and scripts

## [0.0.1] - 2026-01-30

### Added
- Initial release of npm quick
- Command to discover and execute scripts from package.json via Command Palette
- Automatic package manager detection (npm, pnpm, yarn)
- Quick pick interface for script selection with search/filter support
- Integrated terminal execution with proper command formatting
- Support for multiple workspace configurations
- Extension scaffolding with TypeScript support
- Extension icon for marketplace

### Features
- Reads and parses package.json from the workspace root
- Extracts and displays all scripts from the scripts section
- Detects package manager based on lock files:
  - `pnpm-lock.yaml` for pnpm
  - `yarn.lock` for yarn
  - `package-lock.json` for npm
  - Defaults to npm if no lock file found
- Executes scripts using appropriate package manager command