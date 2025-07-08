import { EncryptionService } from '../../src/utils/encryption';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const validKey = 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234';

  beforeEach(() => {
    encryptionService = new EncryptionService(validKey);
  });

  describe('constructor', () => {
    it('should create instance with valid key', () => {
      expect(() => new EncryptionService(validKey)).not.toThrow();
    });

    it('should throw error for invalid key length', () => {
      expect(() => new EncryptionService('short-key')).toThrow(
        'Encryption key must be 64 hex characters'
      );
    });

    it('should throw error for empty key', () => {
      expect(() => new EncryptionService('')).toThrow(
        'Encryption key must be 64 hex characters'
      );
    });

    it('should throw error for null key', () => {
      expect(() => new EncryptionService(null as any)).toThrow(
        'Encryption key must be 64 hex characters'
      );
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt simple text', async () => {
      const plaintext = 'Hello, World!';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt empty string', async () => {
      const plaintext = '';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON data', async () => {
      const data = {
        userId: 'user-123',
        roles: ['admin', 'user'],
        metadata: {
          loginTime: new Date().toISOString(),
          ipAddress: '192.168.1.1'
        }
      };
      
      const plaintext = JSON.stringify(data);
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should encrypt and decrypt large text', async () => {
      const plaintext = 'A'.repeat(10000);
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode text', async () => {
      const plaintext = '🔐 Sécuríty tëst with ñørwegian chars: æøå 测试';
      
      const encrypted = await encryptionService.encrypt(plaintext);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different encrypted output for same input', async () => {
      const plaintext = 'Same input text';
      
      const encrypted1 = await encryptionService.encrypt(plaintext);
      const encrypted2 = await encryptionService.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Secret message';
      const encrypted = await encryptionService.encrypt(plaintext);
      
      const wrongKeyService = new EncryptionService(
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
      
      await expect(wrongKeyService.decrypt(encrypted))
        .rejects.toThrow('Decryption failed');
    });

    it('should fail to decrypt corrupted data', async () => {
      await expect(encryptionService.decrypt('corrupted-base64-data'))
        .rejects.toThrow('Decryption failed');
    });

    it('should fail to decrypt invalid base64', async () => {
      await expect(encryptionService.decrypt('not-base64!!!'))
        .rejects.toThrow('Decryption failed');
    });
  });

  describe('generateKey', () => {
    it('should generate valid encryption key', () => {
      const key = encryptionService.generateKey();
      
      expect(key).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work with EncryptionService', async () => {
      const key = encryptionService.generateKey();
      const newService = new EncryptionService(key);
      
      const plaintext = 'Test with generated key';
      const encrypted = await newService.encrypt(plaintext);
      const decrypted = await newService.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple concurrent encryptions', async () => {
      const plaintexts = Array.from({ length: 10 }, (_, i) => `Message ${i}`);
      
      const encryptPromises = plaintexts.map(text => 
        encryptionService.encrypt(text)
      );
      
      const encrypted = await Promise.all(encryptPromises);
      
      const decryptPromises = encrypted.map(enc => 
        encryptionService.decrypt(enc)
      );
      
      const decrypted = await Promise.all(decryptPromises);
      
      expect(decrypted).toEqual(plaintexts);
    });

    it('should be deterministically decryptable', async () => {
      const plaintext = 'Consistency test';
      const encrypted = await encryptionService.encrypt(plaintext);
      
      // Decrypt multiple times to ensure consistency
      const decryptions = await Promise.all([
        encryptionService.decrypt(encrypted),
        encryptionService.decrypt(encrypted),
        encryptionService.decrypt(encrypted)
      ]);
      
      decryptions.forEach(decrypted => {
        expect(decrypted).toBe(plaintext);
      });
    });

    it('should handle edge case data lengths', async () => {
      const testCases = [
        'a',                    // 1 character
        'ab',                   // 2 characters  
        'a'.repeat(15),         // Block boundary
        'a'.repeat(16),         // Exact block size
        'a'.repeat(17),         // Block size + 1
        'a'.repeat(1023),       // Large but not round
        'a'.repeat(1024)        // Power of 2
      ];
      
      for (const plaintext of testCases) {
        const encrypted = await encryptionService.encrypt(plaintext);
        const decrypted = await encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});