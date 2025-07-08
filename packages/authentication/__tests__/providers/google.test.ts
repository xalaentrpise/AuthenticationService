import { GoogleOAuthProvider } from '../../src/providers/google';
import nock from 'nock';

describe('GoogleOAuthProvider', () => {
  let provider: GoogleOAuthProvider;

  beforeEach(() => {
    provider = new GoogleOAuthProvider({
      clientId: 'test-google-client-id',
      clientSecret: 'test-google-client-secret',
      redirectUri: 'http://localhost:3000/auth/callback'
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('google');
  });

  it('should generate correct login URL', async () => {
    const url = await provider.getLoginUrl('test-state');
    
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-google-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid%20profile%20email');
    expect(url).toContain('state=test-state');
  });

  it('should generate login URL without state', async () => {
    const url = await provider.getLoginUrl();
    
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).not.toContain('state=');
  });

  it('should authenticate with valid code', async () => {
    // Mock token exchange
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    // Mock user info
    nock('https://www.googleapis.com')
      .get('/oauth2/v2/userinfo')
      .reply(200, {
        id: '112233445566778899',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john.doe@gmail.com',
        picture: 'https://example.com/photo.jpg',
        verified_email: true,
        locale: 'en'
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.id).toBe('google-112233445566778899');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@gmail.com');
    expect(user.provider).toBe('google');
    expect(user.roles).toContain('user');
    expect(user.permissions).toContain('profile:read');
    expect(user.metadata?.googleId).toBe('112233445566778899');
    expect(user.metadata?.picture).toBe('https://example.com/photo.jpg');
  });

  it('should handle token exchange failure', async () => {
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(400, { error: 'invalid_grant' });

    await expect(provider.authenticate('invalid-code'))
      .rejects.toThrow('Google authentication failed');
  });

  it('should handle user info failure', async () => {
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://www.googleapis.com')
      .get('/oauth2/v2/userinfo')
      .reply(401, { error: 'unauthorized' });

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Google authentication failed');
  });

  it('should handle custom scopes', () => {
    const customProvider = new GoogleOAuthProvider({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      redirectUri: 'test-uri',
      scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar']
    });

    expect(customProvider.name).toBe('google');
  });

  it('should handle missing name gracefully', async () => {
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://www.googleapis.com')
      .get('/oauth2/v2/userinfo')
      .reply(200, {
        id: '112233445566778899',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john.doe@gmail.com'
        // Missing 'name' field
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.name).toBe('John Doe');
  });
});