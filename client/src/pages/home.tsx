import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeBlock } from '@/components/code-block';
import { FeatureCard } from '@/components/feature-card';
import { ComplianceBadge } from '@/components/compliance-badge';
import { AuthDemo } from '@/components/auth-demo';
import { 
  Shield, 
  Key, 
  CheckCircle, 
  Lock, 
  Users, 
  FileText,
  Home,
  Zap,
  Award,
  Github,
  ExternalLink,
  Download
} from 'lucide-react';

export default function HomePage() {
  const installationCode = `npm install @xala-technologies/authentication`;

  const basicUsageCode = `import { AuthService, IDPortenProvider } from '@xala-technologies/authentication';

// Initialize authentication service
const authService = new AuthService({
  providers: [
    new IDPortenProvider({
      clientId: process.env.IDPORTEN_CLIENT_ID,
      clientSecret: process.env.IDPORTEN_CLIENT_SECRET,
      redirectUri: 'https://your-app.no/auth/callback'
    })
  ],
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  }
});

// Login with ID-porten
const loginUrl = await authService.getLoginUrl('idporten');
// Redirect user to loginUrl

// Handle callback
app.get('/auth/callback', async (req, res) => {
  try {
    const tokens = await authService.handleCallback('idporten', req.query.code);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    res.redirect('/dashboard');
  } catch (error) {
    res.status(401).send('Authentication failed');
  }
});`;

  const middlewareCode = `import { withAuthContext, requirePermission } from '@xala-technologies/authentication';

// Apply auth context middleware
app.use(withAuthContext({
  jwtSecret: process.env.JWT_SECRET,
  skipPaths: ['/health', '/login']
}));

// Protected route with permission check
app.get('/admin/users', 
  requirePermission('users:read', { scope: 'admin' }),
  async (req, res) => {
    // Access authenticated user context
    const { user, permissions, tenant } = req.authContext;
    
    // Check municipal context
    if (tenant.type === 'municipality') {
      const users = await getUsersByMunicipality(tenant.municipalityCode);
      res.json(users);
    } else {
      res.status(403).json({ error: 'Municipal access required' });
    }
  }
);`;

  const multiProviderCode = `import { 
  AuthService, 
  IDPortenProvider, 
  BankIDProvider, 
  FeideProvider,
  DevAuthProvider 
} from '@xala-technologies/authentication';

const authService = new AuthService({
  providers: [
    // ID-porten for public sector
    new IDPortenProvider({
      clientId: process.env.IDPORTEN_CLIENT_ID,
      clientSecret: process.env.IDPORTEN_CLIENT_SECRET,
      environment: 'production',
      scopes: ['openid', 'profile']
    }),
    
    // BankID for strong authentication
    new BankIDProvider({
      clientId: process.env.BANKID_CLIENT_ID,
      clientSecret: process.env.BANKID_CLIENT_SECRET,
      environment: 'production'
    }),
    
    // Feide for educational institutions
    new FeideProvider({
      clientId: process.env.FEIDE_CLIENT_ID,
      clientSecret: process.env.FEIDE_CLIENT_SECRET,
      scope: 'userinfo-name userinfo-email'
    }),
    
    // Development provider for testing
    ...(process.env.NODE_ENV === 'development' ? [
      new DevAuthProvider({
        users: [
          { id: '1', name: 'Test Bruker', email: 'test@kommune.no', roles: ['admin'] },
          { id: '2', name: 'Standard Bruker', email: 'bruker@kommune.no', roles: ['user'] }
        ]
      })
    ] : [])
  ]
});`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">X</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">@xala-technologies/authentication</h1>
                <p className="text-xs text-slate-500">Norwegian-Compliant Auth Package</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#installation" className="text-slate-600 hover:text-slate-900 transition-colors">Installation</a>
              <a href="#docs" className="text-slate-600 hover:text-slate-900 transition-colors">Documentation</a>
              <a href="#compliance" className="text-slate-600 hover:text-slate-900 transition-colors">Compliance</a>
              <Button asChild>
                <a href="https://www.npmjs.com/package/@xala-technologies/authentication">
                  <Download className="w-4 h-4 mr-2" />
                  npm package
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
              <span className="text-sm">v2.1.0 - Production Ready</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Norwegian-Compliant Authentication
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Enterprise-grade authentication package with ID-porten, BankID, Feide integration. 
              Built for Norwegian public sector compliance, GDPR adherence, and seamless Supabase integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-6 py-3 font-mono text-sm">
                npm install @xala-technologies/authentication
              </div>
              <Button size="lg" asChild>
                <a href="#installation">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">100%</div>
              <div className="text-sm text-slate-600">Test Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">5</div>
              <div className="text-sm text-slate-600">Auth Providers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">GDPR</div>
              <div className="text-sm text-slate-600">Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">TypeScript</div>
              <div className="text-sm text-slate-600">Native</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Comprehensive Authentication Solution</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need for secure, compliant authentication in Norwegian enterprise applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Home className="w-6 h-6" />}
              title="Norwegian Providers"
              description="Complete integration with ID-porten, BankID, Feide, and MinID authentication providers."
              features={['ID-porten OIDC', 'BankID Mobile', 'Feide Federation', 'MinID Integration']}
              iconColor="text-red-600"
            />

            <FeatureCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="RBAC Permissions"
              description="Role-based access control with hierarchical permissions and tenant context support."
              features={['Role Hierarchy', 'Fine-grained Permissions', 'Municipal Context', 'Multi-tenant Support']}
              iconColor="text-blue-600"
            />

            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Compliance Ready"
              description="Built-in GDPR, NSM, and Digdir compliance with encrypted audit trails."
              features={['GDPR Consent', 'NSM Encryption', 'Audit Logging', 'Data Retention']}
              iconColor="text-emerald-600"
            />

            <FeatureCard
              icon={<Key className="w-6 h-6" />}
              title="JWT Token Management"
              description="Secure token generation, validation, and refresh with configurable expiration policies."
              features={['RSA/ECDSA Signing', 'Refresh Tokens', 'Session Management', 'Configurable TTL']}
              iconColor="text-purple-600"
            />

            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Framework Integration"
              description="Ready-to-use middleware for Express, Fastify, and Supabase Edge Functions."
              features={['Express Middleware', 'Fastify Plugin', 'Supabase Integration', 'Edge Function Support']}
              iconColor="text-orange-600"
            />

            <FeatureCard
              icon={<Award className="w-6 h-6" />}
              title="Testing & Mocks"
              description="Comprehensive test suite with mock providers for development and CI/CD."
              features={['100% Coverage', 'Mock Providers', 'Integration Tests', 'CI/CD Ready']}
              iconColor="text-pink-600"
            />
          </div>
        </div>
      </section>

      {/* Installation Section */}
      <section id="installation" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Quick Start</h2>
            <p className="text-xl text-slate-600">Get up and running with Norwegian authentication in minutes</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-6">Installation</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Install the package via npm:</p>
                  <CodeBlock code={installationCode} language="bash" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Or with yarn:</p>
                  <CodeBlock code="yarn add @xala-technologies/authentication" language="bash" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-6">Basic Usage</h3>
              <CodeBlock code={basicUsageCode} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Try It Live</h2>
            <p className="text-xl text-slate-600">Experience Norwegian authentication providers in action</p>
          </div>
          
          <AuthDemo />
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Advanced Examples</h2>
            <p className="text-xl text-slate-600">See how to implement advanced authentication patterns</p>
          </div>

          <div className="space-y-12">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Express Middleware with RBAC</h3>
                <CodeBlock code={middlewareCode} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Multiple Authentication Providers</h3>
                <CodeBlock code={multiProviderCode} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Norwegian Compliance</h2>
            <p className="text-xl text-slate-600">Built for public sector requirements and regulatory standards</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ComplianceBadge
              icon={<Shield className="w-8 h-8" />}
              title="GDPR Compliant"
              description="Full GDPR compliance with consent management, data minimization, and right to erasure."
              features={['Consent tracking', 'Data portability', 'Right to erasure', 'Privacy by design']}
              iconColor="text-blue-600"
            />

            <ComplianceBadge
              icon={<Lock className="w-8 h-8" />}
              title="NSM Certified"
              description="Meets Norwegian National Security Authority encryption and security standards."
              features={['ChaCha20-Poly1305', 'Approved algorithms', 'Key management', 'Audit requirements']}
              iconColor="text-red-600"
            />

            <ComplianceBadge
              icon={<Zap className="w-8 h-8" />}
              title="Digdir Integration"
              description="Native support for Norwegian Agency for Digital Government services and standards."
              features={['ID-porten integration', 'Maskinporten support', 'eFormidling ready', 'Altinn compatibility']}
              iconColor="text-emerald-600"
            />
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section id="docs" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Documentation & Resources</h2>
            <p className="text-xl text-slate-600">Everything you need to integrate and deploy successfully</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">API Reference</h3>
                <p className="text-sm text-slate-600">Complete API documentation with examples and TypeScript definitions.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600/20 transition-colors">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Setup Guide</h3>
                <p className="text-sm text-slate-600">Step-by-step setup instructions for all supported frameworks and providers.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600/20 transition-colors">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Examples</h3>
                <p className="text-sm text-slate-600">Real-world examples and best practices for Norwegian applications.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow group cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-600/20 transition-colors">
                  <ExternalLink className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Support</h3>
                <p className="text-sm text-slate-600">Get help with implementation, troubleshooting, and compliance questions.</p>
              </CardContent>
            </Card>
          </div>

          {/* Publishing Section */}
          <Card className="mt-16">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold text-slate-900 mb-6">Package Publishing</h3>
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-medium text-slate-900 mb-4">Publishing Script</h4>
                  <p className="text-slate-600 mb-4">Automated publishing with semantic versioning and compliance checks:</p>
                  <CodeBlock 
                    code={`#!/bin/bash
# publish.sh - Semantic versioning and NPM publishing

set -e

# Run compliance checks
npm run lint
npm run typecheck
npm run test:coverage
npm run security:audit

# Build package
npm run build

# Determine version bump
VERSION_TYPE=\${1:-patch}  # major, minor, patch
npm version $VERSION_TYPE

# Update changelog
npm run changelog:generate

# Publish to NPM
npm publish --access public

# Create GitHub release
gh release create "v$(node -p "require('./package.json').version")" \\
  --title "Release v$(node -p "require('./package.json').version")" \\
  --notes-file CHANGELOG.md

echo "✅ Package published successfully!"`}
                    language="bash"
                  />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-slate-900 mb-4">Version Management</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">Current Version</span>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">v2.1.0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">Downloads</span>
                      <span className="text-slate-600">12,456 this month</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">License</span>
                      <span className="text-slate-600">MIT</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">Bundle Size</span>
                      <span className="text-slate-600">45.2KB (gzipped)</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button asChild className="w-full">
                      <a href="https://www.npmjs.com/package/@xala-technologies/authentication">
                        View on NPM
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="text-xl font-semibold">Xala Technologies</span>
              </div>
              <p className="text-slate-400 mb-6">
                Building the future of Norwegian digital infrastructure with secure, compliant, and developer-friendly solutions.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Github className="w-6 h-6" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <ExternalLink className="w-6 h-6" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-6">Resources</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-6">Support</h3>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">GitHub Issues</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Stack Overflow</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community Slack</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2024 Xala Technologies. All rights reserved. Made in Norway 🇳🇴</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
