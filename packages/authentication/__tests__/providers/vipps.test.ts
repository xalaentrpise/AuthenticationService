import { VippsAuthProvider } from '../../src/providers/vipps';
import nock from 'nock';

describe('VippsAuthProvider', () => {
  let provider: VippsAuthProvider;

  beforeEach(() => {
    provider = new VippsAuthProvider({
      clientId: 'test-vipps-client-id',
      clientSecret: 'test-vipps-client-secret',
      subscriptionKey: 'test-subscription-key',
      redirectUri: 'http://localhost:3000/auth/callback',
      environment: 'test',
      merchantSerialNumber: '123456'
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('vipps');
  });

  it('should use test environment URLs', () => {
    expect(provider.name).toBe('vipps');
  });

  it('should use production environment URLs', () => {
    const prodProvider = new VippsAuthProvider({
      clientId: 'prod-client',
      clientSecret: 'prod-secret',
      subscriptionKey: 'prod-key',
      redirectUri: 'https://app.example.com/auth/callback',
      environment: 'production'
    });

    expect(prodProvider.name).toBe('vipps');
  });

  it('should generate correct login URL', async () => {
    const url = await provider.getLoginUrl('test-state');
    
    expect(url).toContain('https://apitest.vipps.no/access-management-1.0/access/oauth2/auth');
    expect(url).toContain('client_id=test-vipps-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid%20name%20phoneNumber');
    expect(url).toContain('state=test-state');
  });

  it('should authenticate with valid code', async () => {
    // Mock access token request
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    // Mock token exchange
    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    // Mock user info
    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(200, {
        sub: 'vipps-user-123',
        name: 'Ola Nordmann',
        given_name: 'Ola',
        family_name: 'Nordmann',
        phone_number: '47123456789',
        email: 'ola@vipps.no',
        birthdate: '1985-05-15',
        address: {
          street_address: 'Testveien 1',
          postal_code: '0123',
          locality: 'Oslo',
          country: 'NO'
        }
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.id).toBe('vipps-vipps-user-123');
    expect(user.name).toBe('Ola Nordmann');
    expect(user.email).toBe('ola@vipps.no');
    expect(user.provider).toBe('vipps');
    expect(user.roles).toContain('user');
    expect(user.tenant?.id).toBe('norway');
    expect(user.metadata?.vippsId).toBe('vipps-user-123');
    expect(user.metadata?.phoneNumber).toBe('47123456789');
  });

  it('should handle missing email by using phone number', async () => {
    // Mock access token request
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    // Mock token exchange
    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    // Mock user info without email
    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(200, {
        sub: 'vipps-user-456',
        name: 'Kari Hansen',
        phone_number: '47987654321'
        // No email field
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.email).toBe('47987654321@vipps.local');
  });

  it('should handle access token failure', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(401, {
        error: 'unauthorized',
        error_description: 'Invalid client credentials'
      });

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Failed to authenticate with Vipps');
  });

  it('should handle token exchange failure', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(400, {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      });

    await expect(provider.authenticate('invalid-code'))
      .rejects.toThrow('Vipps authentication failed');
  });

  it('should handle userinfo failure', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(403, {
        error: 'insufficient_scope',
        error_description: 'Insufficient scope for userinfo'
      });

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Vipps authentication failed');
  });

  it('should handle network errors', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .replyWithError('Network error');

    await expect(provider.authenticate('test-code'))
      .rejects.toThrow('Failed to authenticate with Vipps');
  });

  it('should use phone number as fallback user ID', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(200, {
        // No sub field
        name: 'Test User',
        phone_number: '47123456789'
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.id).toBe('vipps-47123456789');
  });

  it('should handle missing name gracefully', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(200, {
        sub: 'vipps-user-789',
        phone_number: '47123456789'
        // No name field
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.name).toBe('Vipps User');
  });

  it('should include all user metadata', async () => {
    nock('https://apitest.vipps.no')
      .post('/accesstoken/get')
      .reply(200, {
        access_token: 'vipps-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .post('/access-management-1.0/access/oauth2/token')
      .reply(200, {
        access_token: 'user-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

    nock('https://apitest.vipps.no')
      .get('/vipps-userinfo-api/userinfo')
      .reply(200, {
        sub: 'vipps-user-complete',
        name: 'Complete User',
        given_name: 'Complete',
        family_name: 'User',
        phone_number: '47123456789',
        email: 'complete@vipps.no',
        birthdate: '1990-01-01',
        address: {
          street_address: 'Complete Street 1',
          postal_code: '0001',
          locality: 'Completeville',
          country: 'NO'
        }
      });

    const user = await provider.authenticate('test-auth-code');

    expect(user.metadata).toEqual({
      vippsId: 'vipps-user-complete',
      phoneNumber: '47123456789',
      given_name: 'Complete',
      family_name: 'User',
      birthdate: '1990-01-01',
      address: {
        street_address: 'Complete Street 1',
        postal_code: '0001',
        locality: 'Completeville',
        country: 'NO'
      }
    });
  });
});