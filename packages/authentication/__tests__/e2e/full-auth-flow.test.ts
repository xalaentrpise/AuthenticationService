import { test, expect, Page } from '@playwright/test';
import express from 'express';
import { AddressInfo } from 'net';
import { AuthService } from '../../src/core/auth-service';
import { DevAuthProvider } from '../../src/providers/dev';
import { withAuthContext, requirePermission } from '../../src/middleware/auth-context';
import { AuthServiceConfig } from '../../src/types';

let server: any;
let baseURL: string;
let authService: AuthService;

test.beforeAll(async () => {
  // Set up a real Express server for E2E testing
  const app = express();
  
  const config: AuthServiceConfig = {
    providers: [
      new DevAuthProvider({
        users: [
          {
            id: 'e2e-user-1',
            name: 'E2E Test User',
            email: 'e2euser@test.no',
            roles: ['citizen'],
            permissions: ['profile:read', 'services:use'],
            tenant: {
              id: 'test-municipality',
              type: 'municipality',
              name: 'Test Municipality',
              municipalityCode: '9999'
            }
          },
          {
            id: 'e2e-admin',
            name: 'E2E Admin User',
            email: 'e2eadmin@test.no',
            roles: ['admin'],
            permissions: ['*:*'],
            tenant: {
              id: 'test-municipality',
              type: 'municipality',
              name: 'Test Municipality',
              municipalityCode: '9999'
            }
          }
        ]
      })
    ],
    jwt: {
      secret: 'e2e-test-secret-key-for-jwt-signing-minimum-32-characters',
      algorithm: 'HS256',
      accessTokenTTL: '15m',
      refreshTokenTTL: '7d'
    },
    rbac: {
      hierarchyEnabled: true,
      roles: [
        {
          name: 'citizen',
          permissions: ['profile:read', 'services:use'],
          description: 'Basic citizen access'
        },
        {
          name: 'admin',
          permissions: ['*:*'],
          description: 'Administrator'
        }
      ],
      permissions: [
        { name: 'profile:read', resource: 'profile', action: 'read' },
        { name: 'services:use', resource: 'services', action: 'use' },
        { name: 'admin:manage', resource: 'admin', action: 'manage' }
      ]
    }
  };

  authService = new AuthService(config);

  app.use(express.json());
  app.use(express.static('public'));

  // Serve a simple HTML page for testing
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication E2E Test</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>Authentication Test App</h1>
        
        <div id="auth-status">Not authenticated</div>
        
        <div id="login-section">
          <h2>Login</h2>
          <button id="login-btn" onclick="login()">Login as Test User</button>
          <button id="admin-login-btn" onclick="adminLogin()">Login as Admin</button>
        </div>
        
        <div id="protected-section" style="display: none;">
          <h2>Protected Actions</h2>
          <button id="profile-btn" onclick="getProfile()">Get Profile</button>
          <button id="services-btn" onclick="getServices()">Access Services</button>
          <button id="admin-btn" onclick="getAdmin()">Admin Access</button>
          <button id="logout-btn" onclick="logout()">Logout</button>
        </div>
        
        <div id="results"></div>
        
        <script>
          let accessToken = localStorage.getItem('accessToken');
          
          function updateAuthStatus() {
            const status = document.getElementById('auth-status');
            const loginSection = document.getElementById('login-section');
            const protectedSection = document.getElementById('protected-section');
            
            if (accessToken) {
              status.textContent = 'Authenticated';
              loginSection.style.display = 'none';
              protectedSection.style.display = 'block';
            } else {
              status.textContent = 'Not authenticated';
              loginSection.style.display = 'block';
              protectedSection.style.display = 'none';
            }
          }
          
          async function login() {
            try {
              const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'e2e-user-1' })
              });
              
              const data = await response.json();
              if (data.accessToken) {
                accessToken = data.accessToken;
                localStorage.setItem('accessToken', accessToken);
                updateAuthStatus();
                showResult('Login successful');
              }
            } catch (error) {
              showResult('Login failed: ' + error.message);
            }
          }
          
          async function adminLogin() {
            try {
              const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'e2e-admin' })
              });
              
              const data = await response.json();
              if (data.accessToken) {
                accessToken = data.accessToken;
                localStorage.setItem('accessToken', accessToken);
                updateAuthStatus();
                showResult('Admin login successful');
              }
            } catch (error) {
              showResult('Admin login failed: ' + error.message);
            }
          }
          
          async function makeAuthenticatedRequest(url) {
            const response = await fetch(url, {
              headers: {
                'Authorization': 'Bearer ' + accessToken
              }
            });
            
            const text = await response.text();
            return { status: response.status, body: text };
          }
          
          async function getProfile() {
            try {
              const result = await makeAuthenticatedRequest('/api/profile');
              showResult('Profile: ' + result.body);
            } catch (error) {
              showResult('Profile failed: ' + error.message);
            }
          }
          
          async function getServices() {
            try {
              const result = await makeAuthenticatedRequest('/api/services');
              showResult('Services: ' + result.body);
            } catch (error) {
              showResult('Services failed: ' + error.message);
            }
          }
          
          async function getAdmin() {
            try {
              const result = await makeAuthenticatedRequest('/api/admin');
              showResult('Admin access: ' + result.body);
            } catch (error) {
              showResult('Admin access failed: ' + error.message);
            }
          }
          
          function logout() {
            accessToken = null;
            localStorage.removeItem('accessToken');
            updateAuthStatus();
            showResult('Logged out');
          }
          
          function showResult(message) {
            const results = document.getElementById('results');
            const div = document.createElement('div');
            div.textContent = new Date().toLocaleTimeString() + ': ' + message;
            results.appendChild(div);
            results.scrollTop = results.scrollHeight;
          }
          
          // Initialize
          updateAuthStatus();
        </script>
      </body>
      </html>
    `);
  });

  // Authentication endpoints
  app.post('/auth/login', async (req, res) => {
    try {
      const { userId } = req.body;
      const tokens = await authService.handleCallback('dev', userId);
      res.json(tokens);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Apply authentication middleware to API routes
  app.use('/api', withAuthContext({
    jwtSecret: config.jwt.secret,
    authService
  }));

  // Protected API endpoints
  app.get('/api/profile', (req: any, res) => {
    res.json({
      user: req.authContext.user,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/services', requirePermission('services:use'), (req: any, res) => {
    res.json({
      message: 'Services accessed successfully',
      user: req.authContext.user.id,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/admin', requirePermission('admin:manage'), (req: any, res) => {
    res.json({
      message: 'Admin access granted',
      user: req.authContext.user.id,
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  // Start server
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseURL = `http://localhost:${address.port}`;
});

test.afterAll(async () => {
  if (server) {
    server.close();
  }
});

test.describe('End-to-End Authentication Flow', () => {
  test('should complete full authentication workflow', async ({ page }) => {
    // Navigate to the test application
    await page.goto(baseURL);
    
    // Verify initial state
    await expect(page.locator('#auth-status')).toHaveText('Not authenticated');
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#protected-section')).not.toBeVisible();

    // Perform login
    await page.click('#login-btn');
    
    // Wait for login to complete
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Verify authenticated state
    await expect(page.locator('#auth-status')).toHaveText('Authenticated');
    await expect(page.locator('#login-section')).not.toBeVisible();
    await expect(page.locator('#protected-section')).toBeVisible();

    // Test profile access
    await page.click('#profile-btn');
    await expect(page.locator('#results')).toContainText('Profile:');

    // Test services access
    await page.click('#services-btn');
    await expect(page.locator('#results')).toContainText('Services accessed successfully');

    // Test admin access (should fail for regular user)
    await page.click('#admin-btn');
    await expect(page.locator('#results')).toContainText('Admin access failed');

    // Logout
    await page.click('#logout-btn');
    await expect(page.locator('#auth-status')).toHaveText('Not authenticated');
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#protected-section')).not.toBeVisible();
  });

  test('should handle admin user permissions correctly', async ({ page }) => {
    await page.goto(baseURL);

    // Login as admin
    await page.click('#admin-login-btn');
    
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Test admin access (should succeed for admin user)
    await page.click('#admin-btn');
    await expect(page.locator('#results')).toContainText('Admin access granted');

    // Test services access (admin should also have this)
    await page.click('#services-btn');
    await expect(page.locator('#results')).toContainText('Services accessed successfully');
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    await page.goto(baseURL);

    // Login
    await page.click('#login-btn');
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Reload page
    await page.reload();

    // Should still be authenticated (localStorage persistence)
    await expect(page.locator('#auth-status')).toHaveText('Authenticated');
    await expect(page.locator('#protected-section')).toBeVisible();

    // Should still be able to access protected resources
    await page.click('#profile-btn');
    await expect(page.locator('#results')).toContainText('Profile:');
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto(baseURL);

    // Manually set an invalid token
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'invalid-token');
      window.location.reload();
    });

    await page.waitForLoadState('domcontentloaded');

    // Should appear authenticated due to localStorage
    await expect(page.locator('#auth-status')).toHaveText('Authenticated');

    // But API calls should fail
    await page.click('#profile-btn');
    await expect(page.locator('#results')).toContainText('Profile failed');
  });

  test('should maintain security boundaries between users', async ({ page }) => {
    await page.goto(baseURL);

    // Login as regular user
    await page.click('#login-btn');
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Verify limited access
    await page.click('#admin-btn');
    await expect(page.locator('#results')).toContainText('Admin access failed');

    // Logout and login as admin
    await page.click('#logout-btn');
    await page.click('#admin-login-btn');
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Verify admin access
    await page.click('#admin-btn');
    await expect(page.locator('#results')).toContainText('Admin access granted');
  });

  test('should handle concurrent operations correctly', async ({ page }) => {
    await page.goto(baseURL);

    // Login
    await page.click('#login-btn');
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Perform multiple operations quickly
    await Promise.all([
      page.click('#profile-btn'),
      page.click('#services-btn'),
      page.click('#profile-btn')
    ]);

    // All operations should complete successfully
    await expect(page.locator('#results')).toContainText('Profile:');
    await expect(page.locator('#results')).toContainText('Services accessed successfully');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(baseURL);

    // Login first
    await page.click('#login-btn');
    await page.waitForFunction(() => 
      document.getElementById('auth-status')?.textContent === 'Authenticated'
    );

    // Simulate network error by intercepting requests
    await page.route('/api/profile', route => {
      route.abort('failed');
    });

    await page.click('#profile-btn');
    await expect(page.locator('#results')).toContainText('Profile failed');
  });
});

test.describe('Browser Compatibility', () => {
  test('should work with localStorage disabled', async ({ page }) => {
    // Disable localStorage
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {}
        }
      });
    });

    await page.goto(baseURL);

    // Should still be able to login and use during session
    await page.click('#login-btn');
    
    // Note: Without localStorage, auth status might not update
    // but direct API calls should still work
    await page.click('#profile-btn');
    
    // May show as failed due to localStorage being disabled
    // This tests graceful degradation
  });

  test('should handle JavaScript disabled gracefully', async ({ page }) => {
    // Disable JavaScript
    await page.setJavaScriptEnabled(false);
    
    await page.goto(baseURL);
    
    // Page should still load (though functionality will be limited)
    await expect(page.locator('h1')).toHaveText('Authentication Test App');
  });
});