import { ComplianceLogger } from '../../src/compliance/logger';
import { EncryptionService } from '../../src/utils/encryption';
import { ComplianceConfig, AuditEvent } from '../../src/types';

// Mock the storage methods
const mockStoreLogEntry = jest.fn();
const mockGetUserAuditLogs = jest.fn();
const mockDeleteUserAuditLogs = jest.fn();

jest.mock('../../src/compliance/logger', () => {
  const actual = jest.requireActual('../../src/compliance/logger');
  return {
    ...actual,
    ComplianceLogger: class extends actual.ComplianceLogger {
      private async storeLogEntry(logEntry: any): Promise<void> {
        return mockStoreLogEntry(logEntry);
      }
      
      private async getUserAuditLogs(userId: string): Promise<any[]> {
        return mockGetUserAuditLogs(userId);
      }
      
      private async deleteUserAuditLogs(userId: string): Promise<void> {
        return mockDeleteUserAuditLogs(userId);
      }
    }
  };
});

describe('ComplianceLogger', () => {
  let complianceLogger: ComplianceLogger;
  let config: ComplianceConfig;
  let mockEvent: AuditEvent;

  beforeEach(() => {
    config = {
      gdprEnabled: true,
      auditLogging: true,
      encryptionKey: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
      dataMinimization: true,
      retentionPeriod: '7 years'
    };

    complianceLogger = new ComplianceLogger(config);

    mockEvent = {
      eventId: 'evt-123',
      eventType: 'authentication',
      status: 'success',
      userId: 'user-123',
      provider: 'idporten',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date(),
      metadata: {
        sessionId: 'session-456',
        deviceFingerprint: 'device-789'
      }
    };

    // Clear mocks
    mockStoreLogEntry.mockClear();
    mockGetUserAuditLogs.mockClear();
    mockDeleteUserAuditLogs.mockClear();
  });

  describe('logAuthEvent', () => {
    it('should log authentication event with all fields', async () => {
      await complianceLogger.logAuthEvent(mockEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: mockEvent.eventId,
          eventType: mockEvent.eventType,
          status: mockEvent.status,
          userId: mockEvent.userId,
          provider: mockEvent.provider,
          timestamp: mockEvent.timestamp
        })
      );
    });

    it('should generate event ID if not provided', async () => {
      const eventWithoutId = { ...mockEvent };
      delete eventWithoutId.eventId;

      await complianceLogger.logAuthEvent(eventWithoutId);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: expect.stringMatching(/^audit-[a-f0-9-]+$/),
          eventType: mockEvent.eventType,
          status: mockEvent.status
        })
      );
    });

    it('should minimize IP address when data minimization is enabled', async () => {
      await complianceLogger.logAuthEvent(mockEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.0' // Last octet should be zeroed
        })
      );
    });

    it('should minimize user agent when data minimization is enabled', async () => {
      await complianceLogger.logAuthEvent(mockEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
      );
    });

    it('should not minimize data when data minimization is disabled', async () => {
      const nonMinimizingConfig = { ...config, dataMinimization: false };
      const logger = new ComplianceLogger(nonMinimizingConfig);

      await logger.logAuthEvent(mockEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: mockEvent.ipAddress,
          userAgent: mockEvent.userAgent
        })
      );
    });

    it('should encrypt metadata when encryption is enabled', async () => {
      await complianceLogger.logAuthEvent(mockEvent);

      const storedEntry = mockStoreLogEntry.mock.calls[0][0];
      expect(storedEntry.encryptedMetadata).toBeDefined();
      expect(storedEntry.metadata).toEqual({});
      expect(storedEntry.encrypted).toBe(true);
    });

    it('should not encrypt metadata when encryption key is not provided', async () => {
      const noEncryptionConfig = { ...config, encryptionKey: undefined };
      const logger = new ComplianceLogger(noEncryptionConfig);

      await logger.logAuthEvent(mockEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: mockEvent.metadata,
          encrypted: undefined
        })
      );
    });

    it('should handle events without optional fields', async () => {
      const minimalEvent: AuditEvent = {
        eventType: 'authentication',
        status: 'success',
        userId: 'user-123',
        provider: 'idporten',
        timestamp: new Date()
      };

      await complianceLogger.logAuthEvent(minimalEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'authentication',
          status: 'success',
          userId: 'user-123',
          provider: 'idporten'
        })
      );
    });
  });

  describe('logPermissionEvent', () => {
    it('should log permission check events', async () => {
      const permissionEvent = {
        userId: 'user-123',
        permission: 'documents:read',
        resource: 'document-456',
        granted: true,
        context: { municipalityCode: '0301' },
        timestamp: new Date()
      };

      await complianceLogger.logPermissionEvent(permissionEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'permission_check',
          userId: 'user-123',
          status: 'granted',
          metadata: expect.objectContaining({
            permission: 'documents:read',
            resource: 'document-456',
            context: { municipalityCode: '0301' }
          })
        })
      );
    });

    it('should log denied permission events', async () => {
      const deniedEvent = {
        userId: 'user-123',
        permission: 'admin:delete',
        resource: 'user-456',
        granted: false,
        reason: 'Insufficient privileges',
        timestamp: new Date()
      };

      await complianceLogger.logPermissionEvent(deniedEvent);

      expect(mockStoreLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'permission_check',
          status: 'denied',
          metadata: expect.objectContaining({
            permission: 'admin:delete',
            reason: 'Insufficient privileges'
          })
        })
      );
    });
  });

  describe('exportUserData', () => {
    it('should export user audit logs', async () => {
      const mockLogs = [
        { eventId: 'evt-1', eventType: 'authentication', timestamp: new Date() },
        { eventId: 'evt-2', eventType: 'permission_check', timestamp: new Date() }
      ];

      mockGetUserAuditLogs.mockResolvedValue(mockLogs);

      const exportedData = await complianceLogger.exportUserData('user-123');

      expect(mockGetUserAuditLogs).toHaveBeenCalledWith('user-123');
      expect(exportedData).toEqual(mockLogs);
    });

    it('should return empty array for user with no logs', async () => {
      mockGetUserAuditLogs.mockResolvedValue([]);

      const exportedData = await complianceLogger.exportUserData('user-456');

      expect(exportedData).toEqual([]);
    });
  });

  describe('deleteUserData', () => {
    it('should delete user audit logs', async () => {
      await complianceLogger.deleteUserData('user-123');

      expect(mockDeleteUserAuditLogs).toHaveBeenCalledWith('user-123');
    });

    it('should not throw error when deleting non-existent user data', async () => {
      mockDeleteUserAuditLogs.mockResolvedValue(undefined);

      await expect(complianceLogger.deleteUserData('non-existent-user'))
        .resolves.not.toThrow();
    });
  });

  describe('data minimization', () => {
    it('should properly minimize IPv4 addresses', async () => {
      const testCases = [
        { input: '192.168.1.100', expected: '192.168.1.0' },
        { input: '10.0.0.1', expected: '10.0.0.0' },
        { input: '172.16.255.255', expected: '172.16.255.0' },
        { input: '127.0.0.1', expected: '127.0.0.0' }
      ];

      for (const testCase of testCases) {
        const event = { ...mockEvent, ipAddress: testCase.input };
        await complianceLogger.logAuthEvent(event);

        expect(mockStoreLogEntry).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ipAddress: testCase.expected
          })
        );
      }
    });

    it('should handle invalid IP addresses gracefully', async () => {
      const invalidIps = ['invalid-ip', '999.999.999.999', '', null, undefined];

      for (const ip of invalidIps) {
        const event = { ...mockEvent, ipAddress: ip as any };
        await complianceLogger.logAuthEvent(event);

        expect(mockStoreLogEntry).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ipAddress: ip || undefined
          })
        );
      }
    });

    it('should minimize user agent strings', async () => {
      const testCases = [
        {
          input: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expected: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        {
          input: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          expected: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        },
        {
          input: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          expected: 'Mozilla/5.0 (X11; Linux x86_64)'
        }
      ];

      for (const testCase of testCases) {
        const event = { ...mockEvent, userAgent: testCase.input };
        await complianceLogger.logAuthEvent(event);

        expect(mockStoreLogEntry).toHaveBeenLastCalledWith(
          expect.objectContaining({
            userAgent: testCase.expected
          })
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStoreLogEntry.mockRejectedValue(new Error('Storage failed'));

      await expect(complianceLogger.logAuthEvent(mockEvent))
        .rejects.toThrow('Storage failed');
    });

    it('should handle encryption errors gracefully', async () => {
      // Use an invalid encryption key to trigger encryption errors
      const invalidConfig = { ...config, encryptionKey: 'invalid-key' };
      
      expect(() => new ComplianceLogger(invalidConfig))
        .toThrow('Encryption key must be 64 hex characters');
    });
  });
});