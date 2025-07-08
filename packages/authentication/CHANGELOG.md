# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-12-08

### Added
- MinID provider support for additional authentication options
- Enhanced RBAC system with role inheritance
- Municipal context support for fine-grained permissions
- Compliance validation utilities
- Automated audit report generation
- GDPR data export and deletion utilities
- NSM-compliant ChaCha20-Poly1305 encryption

### Changed
- Improved JWT token management with configurable TTL
- Enhanced error messages for better debugging
- Updated TypeScript definitions for better type safety
- Optimized middleware performance

### Fixed
- Fixed token refresh race conditions
- Resolved session persistence issues
- Fixed CORS issues with ID-porten callbacks
- Corrected Norwegian locale handling

### Security
- Enhanced encryption key validation
- Improved audit log data minimization
- Strengthened session security headers

## [2.0.0] - 2024-11-15

### Added
- Full TypeScript rewrite
- Support for multiple authentication providers
- RBAC permission system
- Compliance logging and audit trails
- Express and Fastify middleware
- Comprehensive test suite

### Breaking Changes
- Complete API redesign for better TypeScript support
- New configuration format for providers
- Changed authentication flow handling

## [1.2.0] - 2024-10-20

### Added
- BankID mobile authentication support
- Feide federation integration
- Basic audit logging

### Changed
- Improved ID-porten error handling
- Better session management

## [1.1.0] - 2024-09-15

### Added
- ID-porten authentication provider
- Basic JWT token management
- Simple Express middleware

## [1.0.0] - 2024-08-30

### Added
- Initial release
- Basic authentication framework
- Development authentication provider
