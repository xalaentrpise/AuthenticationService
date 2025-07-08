import { EncryptionService } from '../utils/encryption';
import { AuditEvent, ComplianceConfig } from '../types';

export class ComplianceLogger {
  private encryptionService?: EncryptionService;

  constructor(private config: ComplianceConfig) {
    if (config.encryptionKey) {
      this.encryptionService = new EncryptionService(config.encryptionKey);
    }
  }

  async logAuthEvent(event: AuditEvent): Promise<void> {
    if (!this.config.auditLogging) {
      return;
    }

    const logEntry = {
      ...event,
      id: this.generateEventId(),
      encrypted: false
    };

    // Apply GDPR data minimization
    if (this.config.dataMinimization) {
      logEntry.userAgent = this.minimizeUserAgent(event.userAgent);
      logEntry.ipAddress = this.minimizeIpAddress(event.ipAddress);
    }

    // Encrypt sensitive data if encryption is enabled
    if (this.encryptionService) {
      (logEntry as any).encryptedMetadata = await this.encryptionService.encrypt(
        JSON.stringify(logEntry.metadata || {})
      );
      logEntry.metadata = {};
      logEntry.encrypted = true;
    }

    // Store the log entry (implement based on your storage backend)
    await this.storeLogEntry(logEntry);
  }

  async logPermissionEvent(event: {
    type: string;
    userId: string;
    permission: string;
    resource?: string;
    result: boolean;
    context?: any;
  }): Promise<void> {
    const auditEvent: AuditEvent = {
      type: 'PERMISSION_CHECK',
      userId: event.userId,
      timestamp: new Date(),
      metadata: {
        permission: event.permission,
        resource: event.resource,
        result: event.result,
        context: event.context
      }
    };

    await this.logAuthEvent(auditEvent);
  }

  async exportUserData(userId: string): Promise<any[]> {
    // Implement user data export for GDPR compliance
    // This should retrieve all audit logs for a specific user
    // and decrypt them if necessary
    return this.getUserAuditLogs(userId);
  }

  async deleteUserData(userId: string): Promise<void> {
    // Implement user data deletion for GDPR "right to be forgotten"
    // Note: Some audit logs may need to be retained for legal compliance
    await this.deleteUserAuditLogs(userId);
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private minimizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Extract only browser and OS information, remove detailed version info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const osMatch = userAgent.match(/(Windows|macOS|Linux|Android|iOS)/);
    
    return [browserMatch?.[0], osMatch?.[0]].filter(Boolean).join(' ') || 'Unknown';
  }

  private minimizeIpAddress(ipAddress?: string): string | undefined {
    if (!ipAddress) return undefined;
    
    // For IPv4, mask last octet. For IPv6, mask last 64 bits
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    } else if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      return `${parts.slice(0, 4).join(':')}::xxxx`;
    }
    
    return 'xxx.xxx.xxx.xxx';
  }

  private async storeLogEntry(logEntry: any): Promise<void> {
    // TODO: Implement actual storage based on configuration
    // This could be database, file system, or external logging service
    console.log('[AUDIT LOG]', JSON.stringify(logEntry, null, 2));
  }

  private async getUserAuditLogs(userId: string): Promise<any[]> {
    // TODO: Implement retrieval of user's audit logs
    return [];
  }

  private async deleteUserAuditLogs(userId: string): Promise<void> {
    // TODO: Implement deletion of user's audit logs
    console.log(`[AUDIT] Deleting audit logs for user: ${userId}`);
  }
}
