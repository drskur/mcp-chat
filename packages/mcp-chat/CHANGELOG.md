# Changelog

All notable changes to this project will be documented in this file.

## [0.1.9] - 2025-07-09

### Fixed

- OAuth flow stability and codeVerifier regeneration issues
- MCP client error handling and connection management
- Server status display for OAuth-authenticated servers

### Changed

- Improved OAuth state persistence and UI updates
- Refactored MCP client architecture for better reliability
- Enhanced performance by removing duplicate operations

## [0.1.5] - 2025-07-08

### Added

- OAuth authentication support for HTTP MCP servers
- One-click OAuth integration with status indicators
- ResilientMultiServerMCPClient for fault tolerance

### Changed

- OAuth button placement and status messages
- Server error handling improvements

### Fixed

- OAuth button visibility issues
- Client initialization errors

## [0.1.4] - 2025-06-27

### Added

- Current date context to model prompts

### Changed

- Model configuration for dynamic system prompts
- Model IDs to cross-region format

### Removed

- Debug statements and unused methods

## [0.1.3] - 2025-06-26

### Added

- MCP defaults system and version display

### Changed

- Loading component enhancements

## [0.1.2] - 2025-06-26

### Added

- Loading screen for configuration saves
- Tool argument editing in approval dialog

### Changed

- Dockerfile to use Bun
- MCP workflow improvements

### Fixed

- Tool approval dialog issues

## [0.1.1] - 2025-06-25

### Added

- Tool approval dialog with editable arguments
- Bun package manager support

### Changed

- Dialog UX improvements
- Message history management

### Fixed

- Component lifecycle and validation issues

## [0.1.0] - 2025-06-24

### Added

- Initial MCP client chat application
- Real-time streaming with AWS Bedrock
- Tool execution approval system
- Settings page with theme support

### Changed

- Chat actions architecture
- MCP tools initialization

### Fixed

- Settings page rendering
- Error handling