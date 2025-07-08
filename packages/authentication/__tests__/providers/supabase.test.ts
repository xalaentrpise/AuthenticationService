import { SupabaseAuthProvider } from '../../src/providers/supabase';

describe('SupabaseAuthProvider', () => {
  let provider: SupabaseAuthProvider;

  beforeEach(() => {
    provider = new SupabaseAuthProvider({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-supabase-key',
      jwtSecret: 'test-jwt-secret'
    });
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('supabase');
  });

  it('should return login URL', async () => {
    const url = await provider.getLoginUrl();
    expect(url).toBe('/auth/supabase/login');
  });

  it('should authenticate with valid JWT', async () => {
    // Create a mock JWT payload (base64 encoded)
    const mockPayload = {
      sub: 'supabase-user-123',
      email: 'test@example.com',
      email_verified: true,
      phone: '+4747123456',
      phone_verified: true,
      user_metadata: {
        name: 'Test User',
        roles: ['user']
      },
      app_metadata: {
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'test-tenant',
          type: 'private',
          name: 'Test Organization'
        }
      }
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.id).toBe('supabase-supabase-user-123');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.provider).toBe('supabase');
    expect(user.roles).toContain('user');
    expect(user.permissions).toContain('profile:read');
    expect(user.tenant?.id).toBe('test-tenant');
    expect(user.metadata?.supabaseId).toBe('supabase-user-123');
    expect(user.metadata?.phone).toBe('+4747123456');
  });

  it('should use email prefix as name when name is missing', async () => {
    const mockPayload = {
      sub: 'supabase-user-456',
      email: 'test@example.com',
      email_verified: true
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.name).toBe('test');
  });

  it('should use default roles when none provided', async () => {
    const mockPayload = {
      sub: 'supabase-user-789',
      email: 'test@example.com'
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.roles).toEqual(['user']);
  });

  it('should use default permissions when none provided', async () => {
    const mockPayload = {
      sub: 'supabase-user-789',
      email: 'test@example.com'
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.permissions).toEqual(['profile:read', 'services:use']);
  });

  it('should use default tenant when none provided', async () => {
    const mockPayload = {
      sub: 'supabase-user-789',
      email: 'test@example.com'
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.tenant).toEqual({
      id: 'global',
      type: 'private',
      name: 'Global Users'
    });
  });

  it('should extract roles from user_metadata when app_metadata is missing', async () => {
    const mockPayload = {
      sub: 'supabase-user-999',
      email: 'test@example.com',
      user_metadata: {
        roles: ['admin'],
        permissions: ['*:*']
      }
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.roles).toEqual(['admin']);
    expect(user.permissions).toEqual(['*:*']);
  });

  it('should reject invalid JWT format', async () => {
    const invalidToken = 'invalid.jwt';

    await expect(provider.authenticate(invalidToken))
      .rejects.toThrow('Supabase authentication failed');
  });

  it('should reject JWT with missing sub', async () => {
    const mockPayload = {
      email: 'test@example.com'
      // Missing sub
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    await expect(provider.authenticate(mockToken))
      .rejects.toThrow('Invalid Supabase token');
  });

  it('should reject JWT with missing email', async () => {
    const mockPayload = {
      sub: 'supabase-user-123'
      // Missing email
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    await expect(provider.authenticate(mockToken))
      .rejects.toThrow('Invalid Supabase token');
  });

  it('should handle malformed JSON in JWT payload', async () => {
    const mockToken = [
      'header',
      Buffer.from('invalid-json').toString('base64'),
      'signature'
    ].join('.');

    await expect(provider.authenticate(mockToken))
      .rejects.toThrow('Supabase authentication failed');
  });

  it('should handle JWT with invalid base64 encoding', async () => {
    const mockToken = [
      'header',
      'invalid-base64!!!',
      'signature'
    ].join('.');

    await expect(provider.authenticate(mockToken))
      .rejects.toThrow('Supabase authentication failed');
  });

  it('should throw error for refresh token (not implemented)', async () => {
    await expect(provider.refreshToken('refresh-token'))
      .rejects.toThrow('Supabase token refresh not implemented');
  });

  it('should handle logout', async () => {
    // Should not throw, just log
    await expect(provider.logout('user-123'))
      .resolves.not.toThrow();
  });

  it('should preserve all metadata fields', async () => {
    const mockPayload = {
      sub: 'supabase-user-complete',
      email: 'complete@example.com',
      email_verified: true,
      phone: '+4747123456',
      phone_verified: true,
      user_metadata: {
        name: 'Complete User',
        custom_field: 'custom_value'
      },
      app_metadata: {
        roles: ['admin'],
        permissions: ['*:*'],
        organization: 'test-org'
      }
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.metadata).toEqual({
      supabaseId: 'supabase-user-complete',
      user_metadata: mockPayload.user_metadata,
      app_metadata: mockPayload.app_metadata,
      phone: '+4747123456',
      email_verified: true,
      phone_verified: true
    });
  });

  it('should handle tenant from user_metadata when app_metadata is missing', async () => {
    const mockPayload = {
      sub: 'supabase-user-tenant',
      email: 'tenant@example.com',
      user_metadata: {
        tenant: {
          id: 'user-tenant',
          type: 'municipality',
          name: 'User Municipality'
        }
      }
    };

    const mockToken = [
      'header',
      Buffer.from(JSON.stringify(mockPayload)).toString('base64'),
      'signature'
    ].join('.');

    const user = await provider.authenticate(mockToken);

    expect(user.tenant).toEqual({
      id: 'user-tenant',
      type: 'municipality',
      name: 'User Municipality'
    });
  });
});