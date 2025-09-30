# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 0.2.1 (2025-09-30)


### 📝 Documentation

* Update README with comprehensive features and documentation ([ecc26e2](https://github.com/meatpaste/insomnia-mcp/commit/ecc26e2bf899e71a3a868100691a6858d43c545b))


### 🧪 Tests

* Achieve A-grade testing - 79 tests, full isolation, integration coverage ([d0d49e5](https://github.com/meatpaste/insomnia-mcp/commit/d0d49e527fb568fed2590f5a493db7407166587d))

## [0.2.0] - 2025-09-26

### 🎉 Major Refactor
- Split monolithic `storage.ts` into modular architecture
- Separate modules: `collections.ts`, `requests.ts`, `folders.ts`, `environments.ts`, `db.ts`
- Improved code organization and maintainability

### ✨ Features
- Added HTTP server for Insomnia plugin integration (port 3847)
- Added pre/post request script support
- New getter tools: `get_collection`, `get_request`, `get_folder`, `get_environment`, `get_environment_variable`
- Added `/collections/export` endpoint for Insomnia import
- Added `/collections/hash` endpoint for change detection

### 🐛 Bug Fixes
- Fixed collectionId persistence in converters
- Fixed folder hierarchy validation

### 📝 Documentation
- Updated README with new tool reference
- Added plugin README with installation instructions

### 🧪 Tests
- Expanded test suite to 73 tests across 10 test files
- Added focused tests for folder hierarchy, converters, and tools
- Improved test coverage for all modules

## [0.1.5] - 2025-09-XX

### Added
- Pre/post request script support documented in README
- Collection metadata persistence
- Getter tools for retrieving specific resources

### Changed
- Improved test expectations to match real helper behavior

### Fixed
- Collection ID bug in stored requests

## [0.1.4] - 2025-09-XX

### Added
- Environment variable management
- Folder hierarchy support with nested folders
- Request body and headers support

### Changed
- Improved error messages for missing required fields

## [0.1.0] - 2025-09-XX

### Added
- Initial release
- Basic collection management (list, create)
- Request CRUD operations (create, update, delete)
- Folder support (create, update, delete)
- Environment variable support
- MCP protocol integration
- Direct Insomnia NDJSON database file manipulation

[Unreleased]: https://github.com/yourusername/insomnia-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourusername/insomnia-mcp/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/yourusername/insomnia-mcp/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/yourusername/insomnia-mcp/compare/v0.1.0...v0.1.4
[0.1.0]: https://github.com/yourusername/insomnia-mcp/releases/tag/v0.1.0