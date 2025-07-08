import { DevAuthProvider } from '../src/providers/dev';
import { IDPortenProvider } from '../src/providers/idporten';
import { BankIDProvider } from '../src/providers/bankid';
import { FeideProvider } from '../src/providers/feide';
import nock from 'nock';

describe('Authentication Providers', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('DevAuthProvider', () => {
    let provider: DevAuthProvider;

    beforeEach(() => {
      provider = new DevAuthProvider({
        users: [
          {
            id: 'dev-1',
            name: 'Dev User',
            email: 'dev@test.com',
            roles: ['developer'],
            permissions: ['*:*'],
            tenant: {
              id: 'dev-tenant',
              type: 'municipality',
              name: 'Dev Municipality',
              municipalityCode: '0000'
            }
          }
        ]
      });
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('dev');
    });

    it('should generate login URL', async () => {
      const url = await provider.getLoginUrl();
      expect(url).toBe('/auth/dev/login?user=dev-1');
    });

    it('should authenticate valid user', async () => {
      const user = await provider.authenticate('dev-1');
      
      expect(user).toBeTruthy();
      expect(user.id).toBe('dev-1');
      expect(user.name).toBe('Dev User');
      expect(user.email).toBe('dev@test.com');
      expect(user.roles).toContain('developer');
    });

    it('should reject invalid user', async () => {
      await expect(provider.authenticate('invalid-user'))
        .rejects.toThrow('Invalid user ID or user not found');
    });

    it('should handle empty user list', () => {
      const emptyProvider = new DevAuthProvider({ users: [] });
      expect(emptyProvider.name).toBe('dev');
    });

    it('should handle multiple users', () => {
      const multiProvider = new DevAuthProvider({
        users: [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@test.com',
            roles: ['user'],
            permissions: ['read']
          },
          {
            id: 'user2',
            name: 'User 2',
            email: 'user2@test.com',
            roles: ['admin'],
            permissions: ['*:*']
          }
        ]
      });

      expect(multiProvider.name).toBe('dev');
    });
  });

  describe('IDPortenProvider', () => {
    let provider: IDPortenProvider;

    beforeEach(() => {
      provider = new IDPortenProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        environment: 'test'
      });
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('idporten');
    });

    it('should generate correct login URL', async () => {
      const url = await provider.getLoginUrl();
      
      expect(url).toContain('https://eid-exttest.difi.no/idporten-oidc-provider/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid%20profile');
    });

    it('should handle production environment', () => {
      const prodProvider = new IDPortenProvider({
        clientId: 'prod-client-id',
        clientSecret: 'prod-client-secret',
        redirectUri: 'https://app.example.com/auth/callback',
        environment: 'production'
      });

      expect(prodProvider.name).toBe('idporten');
    });

    it('should authenticate with valid code', async () => {
      // Mock token exchange
      nock('https://eid-exttest.difi.no')
        .post('/idporten-oidc-provider/token')
        .reply(200, {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      // Mock user info
      nock('https://eid-exttest.difi.no')
        .get('/idporten-oidc-provider/userinfo')
        .reply(200, {
          sub: 'idporten-123',
          name: 'Test Bruker',
          email: 'test@kommune.no',
          'https://data.norge.no/vocabulary/municipality': '0301'
        });

      const user = await provider.authenticate('test-auth-code');

      expect(user.id).toBe('idporten-123');
      expect(user.name).toBe('Test Bruker');
      expect(user.email).toBe('test@kommune.no');
      expect(user.tenant?.municipalityCode).toBe('0301');
    });

    it('should handle token exchange failure', async () => {
      nock('https://eid-exttest.difi.no')
        .post('/idporten-oidc-provider/token')
        .reply(400, { error: 'invalid_grant' });

      await expect(provider.authenticate('invalid-code'))
        .rejects.toThrow();
    });

    it('should handle userinfo failure', async () => {
      nock('https://eid-exttest.difi.no')
        .post('/idporten-oidc-provider/token')
        .reply(200, {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      nock('https://eid-exttest.difi.no')
        .get('/idporten-oidc-provider/userinfo')
        .reply(401, { error: 'unauthorized' });

      await expect(provider.authenticate('test-code'))
        .rejects.toThrow();
    });
  });

  describe('BankIDProvider', () => {
    let provider: BankIDProvider;

    beforeEach(() => {
      provider = new BankIDProvider({
        clientId: 'bankid-client',
        clientSecret: 'bankid-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        environment: 'test',
        merchantName: 'Test Municipality'
      });
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('bankid');
    });

    it('should generate correct login URL', async () => {
      const url = await provider.getLoginUrl();
      
      expect(url).toContain('https://auth.test.bankid.no/oauth2/authorize');
      expect(url).toContain('client_id=bankid-client');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
    });

    it('should authenticate with valid code', async () => {
      // Mock token exchange
      nock('https://auth.test.bankid.no')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'bankid-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      // Mock user info
      nock('https://auth.test.bankid.no')
        .get('/oauth2/userinfo')
        .reply(200, {
          sub: 'bankid-456',
          name: 'Kari Nordmann',
          email: 'kari@example.com',
          birthdate: '1985-05-15'
        });

      const user = await provider.authenticate('bankid-code');

      expect(user.id).toBe('bankid-456');
      expect(user.name).toBe('Kari Nordmann');
      expect(user.email).toBe('kari@example.com');
    });

    it('should handle production environment', () => {
      const prodProvider = new BankIDProvider({
        clientId: 'prod-bankid-client',
        clientSecret: 'prod-bankid-secret',
        redirectUri: 'https://app.example.com/auth/callback',
        environment: 'production',
        merchantName: 'Production Municipality'
      });

      expect(prodProvider.name).toBe('bankid');
    });

    it('should handle authentication failure', async () => {
      nock('https://auth.test.bankid.no')
        .post('/oauth2/token')
        .reply(400, { error: 'invalid_request' });

      await expect(provider.authenticate('invalid-bankid-code'))
        .rejects.toThrow();
    });
  });

  describe('FeideProvider', () => {
    let provider: FeideProvider;

    beforeEach(() => {
      provider = new FeideProvider({
        clientId: 'feide-client',
        clientSecret: 'feide-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        environment: 'test'
      });
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('feide');
    });

    it('should generate correct login URL', async () => {
      const url = await provider.getLoginUrl();
      
      expect(url).toContain('https://auth.dataporten-api.no/oauth/authorization');
      expect(url).toContain('client_id=feide-client');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
    });

    it('should authenticate with valid code', async () => {
      // Mock token exchange
      nock('https://auth.dataporten-api.no')
        .post('/oauth/token')
        .reply(200, {
          access_token: 'feide-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      // Mock user info
      nock('https://auth.dataporten-api.no')
        .get('/userinfo')
        .reply(200, {
          user: {
            userid: 'feide-789',
            name: 'Erik Student',
            email: 'erik@student.uio.no'
          },
          audience: 'test-audience'
        });

      const user = await provider.authenticate('feide-code');

      expect(user.id).toBe('feide-789');
      expect(user.name).toBe('Erik Student');
      expect(user.email).toBe('erik@student.uio.no');
    });

    it('should handle test environment correctly', () => {
      expect(provider.name).toBe('feide');
    });

    it('should handle authentication errors', async () => {
      nock('https://auth.dataporten-api.no')
        .post('/oauth/token')
        .reply(401, { error: 'unauthorized_client' });

      await expect(provider.authenticate('invalid-feide-code'))
        .rejects.toThrow();
    });

    it('should handle missing user info', async () => {
      nock('https://auth.dataporten-api.no')
        .post('/oauth/token')
        .reply(200, {
          access_token: 'feide-token',
          token_type: 'Bearer',
          expires_in: 3600
        });

      nock('https://auth.dataporten-api.no')
        .get('/userinfo')
        .reply(200, {
          // Missing user field
          audience: 'test-audience'
        });

      await expect(provider.authenticate('feide-code'))
        .rejects.toThrow();
    });
  });

  describe('Provider Factory Pattern', () => {
    it('should create providers with consistent interface', () => {
      const providers = [
        new DevAuthProvider({ users: [] }),
        new IDPortenProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test'
        }),
        new BankIDProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test',
          merchantName: 'test'
        }),
        new FeideProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test'
        })
      ];

      providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('getLoginUrl');
        expect(provider).toHaveProperty('authenticate');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.getLoginUrl).toBe('function');
        expect(typeof provider.authenticate).toBe('function');
      });
    });

    it('should have unique provider names', () => {
      const providers = [
        new DevAuthProvider({ users: [] }),
        new IDPortenProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test'
        }),
        new BankIDProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test',
          merchantName: 'test'
        }),
        new FeideProvider({
          clientId: 'test',
          clientSecret: 'test',
          redirectUri: 'test',
          environment: 'test'
        })
      ];

      const names = providers.map(p => p.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names).toHaveLength(uniqueNames.length);
      expect(names).toEqual(['dev', 'idporten', 'bankid', 'feide']);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const provider = new IDPortenProvider({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'test',
        environment: 'test'
      });

      // Mock network timeout
      nock('https://eid-exttest.difi.no')
        .post('/idporten-oidc-provider/token')
        .delayConnection(10000)
        .reply(200, {});

      await expect(provider.authenticate('test-code'))
        .rejects.toThrow();
    }, 5000); // 5 second timeout for this test

    it('should handle malformed responses', async () => {
      const provider = new BankIDProvider({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'test',
        environment: 'test',
        merchantName: 'test'
      });

      // Mock malformed JSON response
      nock('https://auth.test.bankid.no')
        .post('/oauth2/token')
        .reply(200, 'invalid-json-response');

      await expect(provider.authenticate('test-code'))
        .rejects.toThrow();
    });

    it('should handle HTTP errors gracefully', async () => {
      const provider = new FeideProvider({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'test',
        environment: 'test'
      });

      nock('https://auth.dataporten-api.no')
        .post('/oauth/token')
        .reply(500, { error: 'internal_server_error' });

      await expect(provider.authenticate('test-code'))
        .rejects.toThrow();
    });
  });
});