# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Configuration module (`src/config.ts`) for centralized configuration management
- Custom error classes in `src/errors.ts` for structured error handling
- `.npmignore` file to exclude development files from npm package
- Dynamic version reading from package.json in SERVER_INFO

### Changed
- HTTP server is now optional and can be disabled with `INSOMNIA_MCP_DISABLE_HTTP_SERVER` env var
- HTTP server port can be configured with `INSOMNIA_MCP_HTTP_PORT` env var (default: 3847)

### Fixed
- Fixed test suite issues with proper directory setup in test helpers
- Fixed version mismatch between package.json and constants.ts

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