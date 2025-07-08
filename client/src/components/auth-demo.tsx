import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from './code-block';
import { 
  Shield, 
  Key, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Globe,
  Lock,
  Mail,
  Phone,
  Link,
  CreditCard
} from 'lucide-react';
import { SiGoogle, SiFacebook } from 'react-icons/si';

interface MockAuthUser {
  id: string;
  name: string;
  email: string;
  provider: string;
  roles: string[];
  permissions: string[];
  tenant: {
    id: string;
    type: 'municipality' | 'county' | 'state' | 'private';
    name: string;
    municipalityCode?: string;
  };
  authenticated: boolean;
  loginTime: Date;
}

export function AuthDemo() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [mockUser, setMockUser] = useState<MockAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const providers = [
    // Norwegian Providers
    {
      id: 'idporten',
      name: 'ID-porten',
      description: 'Norwegian national identity provider',
      icon: <Globe className="w-5 h-5" />,
      color: 'bg-red-600',
      textColor: 'text-red-600',
      category: 'norwegian'
    },
    {
      id: 'bankid',
      name: 'BankID',
      description: 'Norwegian banking identity system',
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      category: 'norwegian'
    },
    {
      id: 'feide',
      name: 'Feide',
      description: 'Educational sector authentication',
      icon: <User className="w-5 h-5" />,
      color: 'bg-green-600',
      textColor: 'text-green-600',
      category: 'norwegian'
    },
    {
      id: 'vipps',
      name: 'Vipps',
      description: 'Norwegian mobile payment authentication',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      category: 'norwegian'
    },
    // Global Providers
    {
      id: 'google',
      name: 'Google',
      description: 'Google OAuth authentication',
      icon: <SiGoogle className="w-5 h-5" />,
      color: 'bg-red-500',
      textColor: 'text-red-500',
      category: 'global'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Facebook social authentication',
      icon: <SiFacebook className="w-5 h-5" />,
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      category: 'global'
    },
    {
      id: 'email',
      name: 'Email/Password',
      description: 'Traditional email and password login',
      icon: <Mail className="w-5 h-5" />,
      color: 'bg-gray-600',
      textColor: 'text-gray-600',
      category: 'passwordless'
    },
    {
      id: 'magic-link',
      name: 'Magic Link',
      description: 'Passwordless email authentication',
      icon: <Link className="w-5 h-5" />,
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      category: 'passwordless'
    },
    {
      id: 'sms-otp',
      name: 'SMS OTP',
      description: 'SMS-based one-time password',
      icon: <Phone className="w-5 h-5" />,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      category: 'passwordless'
    },
    {
      id: 'dev',
      name: 'Development',
      description: 'Mock provider for testing',
      icon: <Key className="w-5 h-5" />,
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      category: 'development'
    }
  ];

  const mockLogin = async (providerId: string) => {
    setIsLoading(true);
    setSelectedProvider(providerId);
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockUsers = {
      idporten: {
        id: 'no-12345678901',
        name: 'Ola Nordmann',
        email: 'ola.nordmann@kommune.no',
        provider: 'ID-porten',
        roles: ['citizen', 'employee'],
        permissions: ['profile:read', 'documents:read', 'services:use'],
        tenant: {
          id: 'oslo-kommune',
          type: 'municipality' as const,
          name: 'Oslo Kommune',
          municipalityCode: '0301'
        },
        authenticated: true,
        loginTime: new Date()
      },
      bankid: {
        id: 'bid-87654321098',
        name: 'Kari Hansen',
        email: 'kari.hansen@bedrift.no',
        provider: 'BankID',
        roles: ['user', 'business'],
        permissions: ['profile:read', 'transactions:read', 'documents:sign'],
        tenant: {
          id: 'dnb-business',
          type: 'private' as const,
          name: 'DNB Business Customer'
        },
        authenticated: true,
        loginTime: new Date()
      },
      feide: {
        id: 'feide-student-123',
        name: 'Erik Studentsen',
        email: 'erik.studentsen@uio.no',
        provider: 'Feide',
        roles: ['student', 'researcher'],
        permissions: ['profile:read', 'courses:access', 'library:access'],
        tenant: {
          id: 'uio',
          type: 'private' as const,
          name: 'University of Oslo'
        },
        authenticated: true,
        loginTime: new Date()
      },
      vipps: {
        id: 'vipps-47123456789',
        name: 'Lars Vippsen',
        email: 'lars@vipps.no',
        provider: 'Vipps',
        roles: ['user'],
        permissions: ['profile:read', 'payments:use'],
        tenant: {
          id: 'vipps-users',
          type: 'private' as const,
          name: 'Vipps Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      google: {
        id: 'google-112233445566778899',
        name: 'Anna Schmidt',
        email: 'anna.schmidt@gmail.com',
        provider: 'Google',
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private' as const,
          name: 'Global Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      facebook: {
        id: 'facebook-987654321012345',
        name: 'Mike Johnson',
        email: 'mike.johnson@facebook.com',
        provider: 'Facebook',
        roles: ['user'],
        permissions: ['profile:read', 'social:connect'],
        tenant: {
          id: 'global',
          type: 'private' as const,
          name: 'Global Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      email: {
        id: 'email-user-456',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@example.com',
        provider: 'Email/Password',
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private' as const,
          name: 'Global Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      'magic-link': {
        id: 'magic-789',
        name: 'John Doe',
        email: 'john.doe@company.com',
        provider: 'Magic Link',
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private' as const,
          name: 'Global Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      'sms-otp': {
        id: 'sms-user-321',
        name: 'Phone User',
        email: '+4747123456@sms.local',
        provider: 'SMS OTP',
        roles: ['user'],
        permissions: ['profile:read', 'services:use'],
        tenant: {
          id: 'global',
          type: 'private' as const,
          name: 'Global Users'
        },
        authenticated: true,
        loginTime: new Date()
      },
      dev: {
        id: 'dev-user-001',
        name: 'Test Bruker',
        email: 'test@xala.no',
        provider: 'Development',
        roles: ['admin', 'developer'],
        permissions: ['*:*'],
        tenant: {
          id: 'xala-dev',
          type: 'private' as const,
          name: 'Xala Development'
        },
        authenticated: true,
        loginTime: new Date()
      }
    };

    setMockUser(mockUsers[providerId as keyof typeof mockUsers]);
    setIsLoading(false);
  };

  const logout = () => {
    setMockUser(null);
    setSelectedProvider('');
  };

  const authFlowCode = `// Authentication flow example
const authService = new AuthService({
  providers: [
    new IDPortenProvider({
      clientId: process.env.IDPORTEN_CLIENT_ID,
      clientSecret: process.env.IDPORTEN_CLIENT_SECRET,
      redirectUri: 'https://your-app.no/auth/callback',
      environment: 'production'
    })
  ],
  jwt: {
    secret: process.env.JWT_SECRET,
    algorithm: 'RS256',
    expiresIn: '1h'
  },
  rbac: {
    roles: [
      {
        name: 'citizen',
        permissions: ['profile:read', 'services:use']
      },
      {
        name: 'employee', 
        permissions: ['profile:read', 'admin:access'],
        inherits: ['citizen']
      }
    ]
  }
});

// Handle login
app.get('/auth/:provider', async (req, res) => {
  const loginUrl = await authService.getLoginUrl(req.params.provider);
  res.redirect(loginUrl);
});

// Handle callback
app.get('/auth/callback/:provider', async (req, res) => {
  const tokens = await authService.handleCallback(
    req.params.provider, 
    req.query.code
  );
  
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  
  res.redirect('/dashboard');
});`;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Interactive Authentication Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="demo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="demo">Live Demo</TabsTrigger>
              <TabsTrigger value="code">Implementation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="demo" className="space-y-6">
              {!mockUser ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Choose Authentication Provider</h3>
                  <Tabs defaultValue="norwegian" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full mb-6">
                      <TabsTrigger value="norwegian">Norwegian</TabsTrigger>
                      <TabsTrigger value="global">Global</TabsTrigger>
                      <TabsTrigger value="passwordless">Passwordless</TabsTrigger>
                      <TabsTrigger value="development">Development</TabsTrigger>
                    </TabsList>

                    <TabsContent value="norwegian">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.filter(p => p.category === 'norwegian').map((provider) => (
                          <Card 
                            key={provider.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isLoading && selectedProvider === provider.id 
                                ? 'ring-2 ring-blue-500' 
                                : ''
                            }`}
                            onClick={() => mockLogin(provider.id)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white`}>
                                  {provider.icon}
                                </div>
                                <div>
                                  <h4 className="font-semibold">{provider.name}</h4>
                                  <p className="text-sm text-slate-600">{provider.description}</p>
                                </div>
                              </div>
                              
                              {isLoading && selectedProvider === provider.id ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Clock className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Authenticating...</span>
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="w-full">
                                  Login with {provider.name}
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="global">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.filter(p => p.category === 'global').map((provider) => (
                          <Card 
                            key={provider.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isLoading && selectedProvider === provider.id 
                                ? 'ring-2 ring-blue-500' 
                                : ''
                            }`}
                            onClick={() => mockLogin(provider.id)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white`}>
                                  {provider.icon}
                                </div>
                                <div>
                                  <h4 className="font-semibold">{provider.name}</h4>
                                  <p className="text-sm text-slate-600">{provider.description}</p>
                                </div>
                              </div>
                              
                              {isLoading && selectedProvider === provider.id ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Clock className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Authenticating...</span>
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="w-full">
                                  Login with {provider.name}
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="passwordless">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.filter(p => p.category === 'passwordless').map((provider) => (
                          <Card 
                            key={provider.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              isLoading && selectedProvider === provider.id 
                                ? 'ring-2 ring-blue-500' 
                                : ''
                            }`}
                            onClick={() => mockLogin(provider.id)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white`}>
                                  {provider.icon}
                                </div>
                                <div>
                                  <h4 className="font-semibold">{provider.name}</h4>
                                  <p className="text-sm text-slate-600">{provider.description}</p>
                                </div>
                              </div>
                              
                              {isLoading && selectedProvider === provider.id ? (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Clock className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Authenticating...</span>
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="w-full">
                                  Login with {provider.name}
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="development">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.filter(p => p.category === 'development').map((provider) => (
                      <Card 
                        key={provider.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isLoading && selectedProvider === provider.id 
                            ? 'ring-2 ring-blue-500' 
                            : ''
                        }`}
                        onClick={() => mockLogin(provider.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white`}>
                              {provider.icon}
                            </div>
                            <div>
                              <h4 className="font-semibold">{provider.name}</h4>
                              <p className="text-sm text-slate-600">{provider.description}</p>
                            </div>
                          </div>
                          
                          {isLoading && selectedProvider === provider.id ? (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Clock className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Authenticating...</span>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="w-full">
                              Login with {provider.name}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Authentication Successful</h3>
                        <p className="text-sm text-slate-600">Logged in via {mockUser.provider}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={logout}>
                      Logout
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">User Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-slate-600">Name:</span>
                          <p className="font-semibold">{mockUser.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-600">Email:</span>
                          <p className="font-semibold">{mockUser.email}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-600">User ID:</span>
                          <p className="font-mono text-sm">{mockUser.id}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-600">Login Time:</span>
                          <p className="text-sm">{mockUser.loginTime.toLocaleString('no-NO')}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Roles & Permissions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-slate-600 block mb-2">Roles:</span>
                          <div className="flex flex-wrap gap-1">
                            {mockUser.roles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-600 block mb-2">Permissions:</span>
                          <div className="space-y-1">
                            {mockUser.permissions.slice(0, 3).map((permission) => (
                              <div key={permission} className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-sm font-mono">{permission}</span>
                              </div>
                            ))}
                            {mockUser.permissions.length > 3 && (
                              <div className="text-sm text-slate-600">
                                +{mockUser.permissions.length - 3} more permissions
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Tenant Context</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-sm font-medium text-slate-600">Organization:</span>
                            <p className="font-semibold">{mockUser.tenant.name}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-600">Type:</span>
                            <Badge variant="outline">{mockUser.tenant.type}</Badge>
                          </div>
                          {mockUser.tenant.municipalityCode && (
                            <div>
                              <span className="text-sm font-medium text-slate-600">Municipality Code:</span>
                              <p className="font-mono">{mockUser.tenant.municipalityCode}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Complete Authentication Flow</h3>
                <CodeBlock code={authFlowCode} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            Compliance Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">GDPR Compliant</p>
                <p className="text-sm text-green-700">Consent tracking & data minimization</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">NSM Certified</p>
                <p className="text-sm text-blue-700">ChaCha20-Poly1305 encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-semibold text-purple-800">Audit Ready</p>
                <p className="text-sm text-purple-700">Complete audit trail logging</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}