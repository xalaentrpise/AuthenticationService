// Export all provider configuration types

export type { GoogleOAuthConfig } from './google';
export type { FacebookOAuthConfig } from './facebook';
export type { EmailAuthConfig, EmailCredentials, EmailRegistration, PasswordResetRequest, PasswordReset } from './email';
export type { MagicLinkConfig, MagicLinkRequest } from './magic-link';
export type { SMSOTPConfig, SMSOTPRequest, SMSOTPVerification } from './sms-otp';
export type { VippsAuthConfig } from './vipps';
export type { SupabaseAuthConfig } from './supabase';

// Provider store interfaces
export type { 
  IEmailUserStore, 
  EmailUser,
  IEmailService 
} from './email';

export type { 
  IMagicLinkUserStore, 
  MagicLinkUser,
  IMagicLinkEmailService 
} from './magic-link';

export type { 
  ISMSUserStore, 
  SMSUser,
  ISMSService,
  IOTPStore 
} from './sms-otp';