# Change Log

All notable changes to the "npm quick" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org).

## [0.0.1] - 2026-01-30

### Added
- Initial release of npm quick
- Command to discover and execute scripts from package.json via Command Palette
- Automatic package manager detection (npm, pnpm, yarn)
- Quick pick interface for script selection with search/filter support
- Integrated terminal execution with proper command formatting
- Support for multiple workspace configurations

### Features
- Reads and parses package.json from the workspace root
- Extracts and displays all scripts from the scripts section
- Detects package manager based on lock files:
  - `pnpm-lock.yaml` for pnpm
  - `yarn.lock` for yarn
  - `package-lock.json` for npm
  - Defaults to npm if no lock file found
- Executes scripts using appropriate package manager command