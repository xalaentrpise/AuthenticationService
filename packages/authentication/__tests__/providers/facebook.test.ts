import { FacebookOAuthProvider } from '../../src/providers/facebook';
import nock from 'nock';

describe('FacebookOAuthProvider', () => {
  let provider: FacebookOAuthProvider;

  beforeEach(() => {
    provider = new FacebookOAuthProvider({
      appId: 'test-facebook-app-id',
      appSecret: 'test-facebook-app-secret',
      redirectUri: 'http://localhost:3000/auth/callback'
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('facebook');
  });

  it('should generate correct login URL', async () => {
    const url = await provider.getLoginUrl('test-state');
    
    expect(url).toContain('https://www.facebook.com/v18.0/dialog/oauth');
    expect(url).toContain('client_id=test-facebook-app-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=email%2Cpublic_profile');
    expect(url).toContain('state=test-state');
  });

  it('should authenticate with valid code', async () => {
    // Mock token exchange
    nock('https://graph.facebook.com')
      .get('/v18.0/oauth/access_token')
      .reply(200, {
        access_token: 'test-facebook-token',
        token_type: 'bearer',
        expires_in: 5184000
      });

    // Mock user info
    nock('https://graph.facebook.com')
      .get('/v18.0/me')
      .reply(200, {
        id: '1234567890123456',
        name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@facebook.com',
        picture: {
          data: {
            url: 'https://example.com/profile.jpg'
          }
        }
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.id).toBe('facebook-1234567890123456');
    expect(user.name).toBe('Jane Smith');
    expect(user.email).toBe('jane.smith@facebook.com');
    expect(user.provider).toBe('facebook');
    expect(user.roles).toContain('user');
    expect(user.permissions).toContain('profile:read');
    expect(user.metadata?.facebookId).toBe('1234567890123456');
    expect(user.metadata?.first_name).toBe('Jane');
    expect(user.metadata?.last_name).toBe('Smith');
  });

  it('should handle token exchange failure', async () => {
    nock('https://graph.facebook.com')
      .get('/v18.0/oauth/access_token')
      .reply(400, { 
        error: {
          message: 'Invalid authorization code',
          type: 'OAuthException',
          code: 100
        }
      });

    await expect(provider.authenticate('invalid-code'))
      .rejects.toThrow('Facebook authentication failed');
  });

  it('should handle user info failure', async () => {
    nock('https://graph.facebook.com')
      .get('/v18.0/oauth/access_token')
      .reply(200, {
        access_token: 'test-facebook-token',
        token_type: 'bearer',
        expires_in: 5184000
      });

    nock('https://graph.facebook.com')
      .get('/v18.0/me')
      .reply(401, { 
        error: {
          message: 'Invalid OAuth access token',
          type: 'OAuthException',
          code: 190
        }
      });

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Facebook authentication failed');
  });

  it('should handle custom scopes', () => {
    const customProvider = new FacebookOAuthProvider({
      appId: 'test-app',
      appSecret: 'test-secret',
      redirectUri: 'test-uri',
      scopes: ['email', 'public_profile', 'user_friends']
    });

    expect(customProvider.name).toBe('facebook');
  });

  it('should handle missing picture data', async () => {
    nock('https://graph.facebook.com')
      .get('/v18.0/oauth/access_token')
      .reply(200, {
        access_token: 'test-facebook-token',
        token_type: 'bearer',
        expires_in: 5184000
      });

    nock('https://graph.facebook.com')
      .get('/v18.0/me')
      .reply(200, {
        id: '1234567890123456',
        name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@facebook.com'
        // Missing picture field
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.id).toBe('facebook-1234567890123456');
    expect(user.metadata?.picture).toBeUndefined();
  });

  it('should handle network errors', async () => {
    nock('https://graph.facebook.com')
      .get('/v18.0/oauth/access_token')
      .replyWithError('Network error');

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Facebook authentication failed');
  });
});