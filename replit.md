# Xala Authentication System

## Overview

This is a Norwegian-compliant authentication system built as part of the Xala Enterprise Platform. The system provides a comprehensive full-stack solution with a React frontend, Express backend, and a dedicated authentication package designed specifically for Norwegian public sector compliance requirements.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: In-memory storage with extensible interface

### Authentication Package
- **Location**: `packages/authentication/`
- **Type**: Standalone NPM package (`@xala-technologies/authentication`)
- **Compliance**: Norwegian public sector requirements (GDPR, NSM, Digdir)
- **Providers**: ID-porten, BankID, Feide, MinID, and development provider

## Key Components

### Core Authentication Components
- **AuthService**: Main authentication orchestrator with event-driven architecture
- **JWTManager**: Secure token generation and validation with configurable algorithms
- **RBACService**: Role-based access control with hierarchical permissions
- **ComplianceLogger**: GDPR-compliant audit logging with encryption support

### Authentication Providers

#### Norwegian Compliance Providers
- **IDPortenProvider**: Norwegian national identity provider integration
- **BankIDProvider**: Norwegian banking identity system with mobile support
- **FeideProvider**: Norwegian educational sector authentication
- **MinIDProvider**: Simplified Norwegian identity verification
- **VippsAuthProvider**: Norwegian mobile payment authentication system
- **DevAuthProvider**: Development and testing authentication with mock users

#### Global OAuth Providers
- **GoogleOAuthProvider**: Google OAuth 2.0 authentication with profile access
- **FacebookOAuthProvider**: Facebook social authentication integration
- **SupabaseAuthProvider**: Supabase authentication service integration

#### Passwordless Authentication
- **EmailAuthProvider**: Traditional email/password with registration and reset flows
- **MagicLinkAuthProvider**: Passwordless email-based authentication with JWT tokens
- **SMSOTPAuthProvider**: SMS-based one-time password verification system

### Database Schema
- **Users Table**: Basic user information with username/password authentication
- **Schema Definition**: Type-safe schema using Drizzle ORM with Zod validation
- **Migration Support**: Database migration system via Drizzle Kit

### UI Components
- **Component Library**: Complete shadcn/ui implementation with 50+ components
- **Design System**: Consistent Norwegian-themed design with CSS variables
- **Responsive Design**: Mobile-first approach with Tailwind CSS utilities

## Data Flow

### Authentication Flow
1. User initiates login through frontend interface
2. Frontend redirects to selected Norwegian authentication provider
3. Provider validates user credentials and returns authorization code
4. Backend exchanges code for user information and creates session
5. JWT tokens are generated with appropriate scopes and permissions
6. Frontend receives tokens and establishes authenticated session

### Permission Checking
1. Authenticated requests include JWT access token
2. Middleware validates token signature and expiration
3. RBAC service checks user permissions against requested resources
4. Municipal and organizational context applied for fine-grained access
5. Audit events logged for compliance requirements

### Compliance Logging
1. All authentication events are captured with minimal data principles
2. Sensitive information is encrypted using ChaCha20-Poly1305
3. IP addresses and user agents are minimized for GDPR compliance
4. Audit trails are generated for Norwegian regulatory requirements

## External Dependencies

### Production Dependencies
- **Authentication**: jsonwebtoken, node-jose for JWT handling
- **Encryption**: Built-in crypto module with ChaCha20-Poly1305
- **HTTP Client**: Axios for external API communication
- **Validation**: Zod for runtime type checking
- **Database**: Drizzle ORM with Neon Database connector
- **UI Framework**: React 18 with extensive Radix UI component library

### Development Dependencies
- **Testing**: Jest with TypeScript support and 90% coverage requirements
- **Type Checking**: TypeScript with strict mode enabled
- **Linting**: ESLint with TypeScript configuration
- **Build Tools**: esbuild for server bundling, Vite for client building

### Norwegian Provider Dependencies
- OAuth 2.0 / OpenID Connect clients for each Norwegian authentication provider
- NSM-approved encryption algorithms and key management
- GDPR-compliant data handling and storage mechanisms

## Deployment Strategy

### Development Environment
- **Server**: Development server with hot reloading via tsx
- **Client**: Vite development server with HMR
- **Database**: Connection to Neon Database with automatic migrations
- **Environment**: Environment variables for provider configuration

### Production Build
- **Server**: Bundled with esbuild to single ESM file in `dist/` directory
- **Client**: Optimized Vite build with code splitting and asset optimization
- **Database**: Production PostgreSQL database with migration support
- **Environment**: Secure environment variable management for production secrets

### Compliance Deployment
- **Security**: NSM-compliant encryption key management
- **Audit**: Automated compliance report generation
- **Monitoring**: Audit trail monitoring for Norwegian regulatory requirements
- **Backup**: GDPR-compliant data retention and deletion policies

## Changelog

```
Changelog:
- July 08, 2025: Initial setup with core Norwegian providers
- July 08, 2025: Added 7 new authentication providers:
  * Global OAuth: Google, Facebook, Supabase
  * Passwordless: Email/Password, Magic Links, SMS OTP
  * Norwegian: Vipps mobile payment authentication
- July 08, 2025: Updated landing page with categorized provider demo
- July 08, 2025: Comprehensive test suite for all 11 authentication providers
- July 08, 2025: Enhanced UI with provider categories and interactive demos
- July 08, 2025: Created comprehensive README with full documentation:
  * Complete installation and configuration guide
  * Detailed examples for all 10+ authentication providers
  * RBAC configuration and middleware integration
  * Security guidelines and compliance information
  * API reference and testing documentation
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```