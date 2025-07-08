import { IDPortenProvider, BankIDProvider, FeideProvider, DevAuthProvider } from '../src/providers';

describe('Authentication Providers', () => {
  describe('DevAuthProvider', () => {
    let provider: DevAuthProvider;

    beforeEach(() => {
      provider = new DevAuthProvider({
        users: [
          { id: '1', name: 'Test User', email: 'test@example.com', roles: ['user'] },
          { id: '2', name: 'Admin User', email: 'admin@example.com', roles: ['admin'] }
        ]
      });
    });

    it('should return correct login URL', async () => {
      const url = await provider.getLoginUrl('test-state');
      expect(url).toContain('/auth/dev/login');
      expect(url).toContain('state=test-state');
    });

    it('should handle callback for valid user', async () => {
      const user = await provider.handleCallback('1');
      
      expect(user.id).toBe('1');
      expect(user.name).toBe('Test User');
      expect(user.roles).toContain('user');
      expect(user.tenant?.type).toBe('municipality');
    });

    it('should throw error for invalid user', async () => {
      await expect(provider.handleCallback('invalid')).rejects.toThrow('Invalid development user');
    });

    it('should validate stored sessions', async () => {
      await provider.handleCallback('1');
      const user = await provider.validateToken('1');
      
      expect(user).toBeTruthy();
      expect(user?.id).toBe('1');
    });

    it('should return dev users list', () => {
      const users = provider.getDevUsers();
      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('1');
    });
  });

  describe('IDPortenProvider', () => {
    let provider: IDPortenProvider;

    beforeEach(() => {
      provider = new IDPortenProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        environment: 'test'
      });
    });

    it('should generate correct login URL', async () => {
      // Mock the discovery endpoint
      jest.spyOn(provider as any, 'getDiscoveryData').mockResolvedValue({
        authorization_endpoint: 'https://test.idporten.no/authorize'
      });

      const url = await provider.getLoginUrl('test-state');
      
      expect(url).toContain('https://test.idporten.no/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid%20profile');
    });

    it('should use correct environment URLs', () => {
      const prodProvider = new IDPortenProvider({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'https://example.com/callback',
        environment: 'production'
      });

      expect((prodProvider as any).wellKnownUrl).toContain('oidc.difi.no');
      expect((provider as any).wellKnownUrl).toContain('oidc-ver2.difi.no');
    });
  });

  describe('BankIDProvider', () => {
    let provider: BankIDProvider;

    beforeEach(() => {
      provider = new BankIDProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        environment: 'test'
      });
    });

    it('should generate correct login URL', async () => {
      const url = await provider.getLoginUrl('test-state');
      
      expect(url).toContain('https://auth.test.bankid.no');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('scope=openid%20profile%20national_identity_number');
    });

    it('should use correct environment URLs', () => {
      const prodProvider = new BankIDProvider({
        clientId: 'test',
        clientSecret: 'test',
        redirectUri: 'https://example.com/callback',
        environment: 'production'
      });

      expect((prodProvider as any).baseUrl).toBe('https://auth.bankid.no');
      expect((provider as any).baseUrl).toBe('https://auth.test.bankid.no');
    });
  });

  describe('FeideProvider', () => {
    let provider: FeideProvider;

    beforeEach(() => {
      provider = new FeideProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback'
      });
    });

    it('should generate correct login URL', async () => {
      const url = await provider.getLoginUrl('test-state');
      
      expect(url).toContain('https://auth.feide.no/oauth/authorization');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('scope=userinfo-name%20userinfo-email%20userinfo-photo');
    });

    it('should include realm and organization in URL when provided', async () => {
      const providerWithRealm = new FeideProvider({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'https://example.com/callback',
        realm: 'uio.no',
        organization: 'fc:org:uio.no'
      });

      const url = await providerWithRealm.getLoginUrl();
      
      expect(url).toContain('feideid=uio.no');
      expect(url).toContain('orgid=fc:org:uio.no');
    });
  });
});
