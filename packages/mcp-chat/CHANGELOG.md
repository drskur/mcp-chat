# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2025-06-27

### Added

- Current date context to model prompts for time-aware AI responses
- `currentDatePrompt` function to provide temporal context in ISO format

### Changed

- Model configuration to use dynamic system prompts with date/time context
- Updated model IDs to use cross-region prefix format for better AWS region support

### Removed

- Debug console.log statements from workflow
- Unused `getToolCount` method from MCP manager

## [0.1.3] - 2025-06-26

### Added

- MCP defaults system with intelligent transport detection
- App version display on general settings page

### Changed

- Enhanced Loading component with customizable text and theme styling

## [0.1.2] - 2025-06-26

### Added

- Loading screen during MCP server configuration save
- Tool use block arguments update functionality in approval dialog

### Changed

- Updated Dockerfile to use Bun for better performance
- Improved MCP workflow management

### Fixed

- Tool approval dialog argument editing issues

## [0.1.1] - 2025-06-25

### Added

- Tool approval dialog with editable arguments
- Bun package manager support

### Changed

- Improved dialog UX and animations
- Enhanced message history management

### Fixed

- SolidJS component lifecycle issues
- Tool call validation errors

## [0.1.0] - 2025-06-24

### Added

- Initial MCP client chat application
- Real-time streaming with AWS Bedrock
- Tool execution approval system
- Settings page and theme switching
- Auto-scroll and JSON editor features

### Changed

- Refactored chat actions architecture
- Improved MCP tools initialization

### Fixed

- Settings page rendering issues
- General error handling improvements