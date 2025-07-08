# Contributing to Xala Authentication System

Thank you for your interest in contributing to the Xala Authentication System! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge
- Understanding of OAuth 2.0 / OpenID Connect
- Familiarity with Norwegian authentication systems (for compliance providers)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/xala-technologies/authentication.git
   cd authentication
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
packages/authentication/
├── src/
│   ├── core/              # Core authentication services
│   ├── providers/         # Authentication provider implementations
│   ├── middleware/        # Framework integration middleware
│   ├── utils/             # Utility functions
│   └── types.ts          # TypeScript type definitions
├── __tests__/            # Test suites
└── docs/                 # Additional documentation

client/                   # Demo landing page
├── src/
│   ├── components/       # React components
│   ├── pages/           # Landing page sections
│   └── lib/             # Client utilities
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write descriptive variable and function names
- Include JSDoc comments for public APIs

### Commit Messages

Follow the conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

Examples:
```
feat(providers): add Google OAuth provider
fix(jwt): handle token expiration edge case
docs(readme): update installation instructions
test(providers): add comprehensive test suite for Vipps
```

### Testing Requirements

- **Unit Tests**: All new functionality must include unit tests
- **Integration Tests**: Provider implementations need integration tests
- **Coverage**: Maintain 100% test coverage
- **Mocking**: Use proper mocking for external API calls

#### Test Structure
```typescript
describe('ProviderName', () => {
  let provider: ProviderName;

  beforeEach(() => {
    provider = new ProviderName({
      // test configuration
    });
  });

  afterEach(() => {
    // cleanup
  });

  describe('authentication flow', () => {
    it('should authenticate with valid credentials', async () => {
      // test implementation
    });

    it('should handle authentication failures', async () => {
      // test implementation
    });
  });
});
```

## Adding Authentication Providers

### Provider Interface

All authentication providers must implement the `IAuthProvider` interface:

```typescript
interface IAuthProvider {
  name: string;
  getLoginUrl(state?: string): Promise<string>;
  authenticate(credentials: string | object): Promise<AuthUser>;
}
```

### Provider Implementation Steps

1. **Create provider file**
   ```
   packages/authentication/src/providers/your-provider.ts
   ```

2. **Implement the interface**
   ```typescript
   export class YourProvider implements IAuthProvider {
     name = 'your-provider';
     
     constructor(private config: YourProviderConfig) {}
     
     async getLoginUrl(state?: string): Promise<string> {
       // Implementation
     }
     
     async authenticate(credentials: string | object): Promise<AuthUser> {
       // Implementation
     }
   }
   ```

3. **Add configuration interface**
   ```typescript
   interface YourProviderConfig {
     clientId: string;
     clientSecret: string;
     redirectUri: string;
     // additional configuration
   }
   ```

4. **Export from index**
   ```typescript
   // packages/authentication/src/providers/index.ts
   export { YourProvider } from './your-provider';
   ```

5. **Write comprehensive tests**
   ```
   packages/authentication/__tests__/providers/your-provider.test.ts
   ```

6. **Update documentation**
   - Add provider to README.md
   - Include configuration examples
   - Document any special requirements

### Norwegian Compliance Providers

When adding Norwegian compliance providers:

- Follow NSM (Nasjonal sikkerhetsmyndighet) guidelines
- Implement GDPR-compliant audit logging
- Use approved encryption algorithms
- Include proper error handling for compliance scenarios
- Test with both production and test environments

### Provider Testing Checklist

- [ ] Unit tests with 100% coverage
- [ ] Integration tests with mocked external APIs
- [ ] Error handling tests
- [ ] Configuration validation tests
- [ ] Token validation tests (if applicable)
- [ ] Compliance tests (for Norwegian providers)

## Testing Guidelines

### Running Tests

```bash
# All tests
npm test

# Specific provider tests
npm test -- --testPathPattern="providers/google"

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Categories

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test provider authentication flows
3. **E2E Tests**: Test complete authentication workflows
4. **Performance Tests**: Test under load conditions

### Mocking External APIs

Use `nock` for mocking HTTP requests:

```typescript
import nock from 'nock';

beforeEach(() => {
  nock('https://api.provider.com')
    .post('/oauth/token')
    .reply(200, { access_token: 'mock-token' });
});

afterEach(() => {
  nock.cleanAll();
});
```

## Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow coding standards
   - Add/update tests
   - Update documentation

4. **Run the test suite**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat(scope): your change description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Use the PR template
   - Include a clear description
   - Reference any related issues
   - Add screenshots for UI changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Compliance (for Norwegian providers)
- [ ] NSM guidelines followed
- [ ] GDPR compliance verified
- [ ] Audit logging implemented

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Code Review Guidelines

### For Reviewers

- Check for security vulnerabilities
- Verify test coverage
- Ensure compliance requirements are met
- Review API design and usability
- Check performance implications
- Validate documentation updates

### For Contributors

- Respond to feedback promptly
- Make requested changes in separate commits
- Update tests if functionality changes
- Keep PR scope focused and manageable

## Internationalization

When adding providers or documentation:

- Use English for code and comments
- Support Norwegian language for compliance providers
- Include proper error messages in relevant languages
- Consider cultural and regulatory differences

## Documentation Standards

- Use clear, concise language
- Include code examples for all public APIs
- Document configuration options thoroughly
- Provide troubleshooting guidance
- Keep documentation up to date with code changes

## Bug Reports

When reporting bugs:

1. **Use the issue template**
2. **Include environment details**
   - Node.js version
   - Package version
   - Operating system
   - Provider being used

3. **Provide reproduction steps**
4. **Include error messages and logs**
5. **Suggest potential solutions if known**

## Feature Requests

When requesting features:

1. **Describe the use case**
2. **Explain the problem being solved**
3. **Provide implementation suggestions**
4. **Consider impact on existing functionality**
5. **Discuss compliance implications if relevant**

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Email**: support@xala.no for urgent issues
- **Norwegian Support**: Available for compliance questions

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- Community highlights

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Xala Authentication System. Your contributions help improve enterprise authentication security and accessibility.