import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-cbc';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits for AES

  constructor(private key: string) {
    if (!key || key.length !== this.keyLength * 2) {
      throw new Error(`Encryption key must be ${this.keyLength * 2} hex characters`);
    }
  }

  async encrypt(plaintext: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.key, 'hex'));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV + encrypted data
      const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const iv = combined.subarray(0, this.ivLength);
      const encrypted = combined.subarray(this.ivLength);

      const decipher = crypto.createDecipher(this.algorithm, Buffer.from(this.key, 'hex'));
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }
}