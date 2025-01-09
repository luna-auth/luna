import { describe, it, expect } from 'vitest';
import { hashPassword } from '../auth/password';
import { verify } from '@node-rs/argon2';

describe('hashPassword', () => {
  it('should hash password correctly', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);

    // Hash should be a string
    expect(typeof hash).toBe('string');

    // Hash should be different than original password
    expect(hash).not.toBe(password);

    // Hash should start with argon2 identifier
    expect(hash).toMatch(/^\$argon2/);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'test123';

    // Generate two hashes for the same password
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Hashes should be different (due to salt)
    expect(hash1).not.toBe(hash2);
  });

  it('should generate verifiable hashes', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);

    // Should verify with correct password
    const isValid = await verify(hash, password);
    expect(isValid).toBe(true);

    // Should not verify with wrong password
    const isInvalid = await verify(hash, 'wrongpassword');
    expect(isInvalid).toBe(false);
  });

  it('should handle empty password', async () => {
    const password = '';
    const hash = await hashPassword(password);

    // Should still generate a hash
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$argon2/);

    // Should verify empty password
    const isValid = await verify(hash, password);
    expect(isValid).toBe(true);
  });
});
