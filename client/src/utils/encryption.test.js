import { describe, expect, it } from 'vitest';
import { createEncryptionEnvelope, unwrapEncryptionKey, encryptPayload, decryptPayload } from './encryption.js';

describe('journal encryption envelope', () => {
  it('round trips an encrypted payload with a separate passphrase-derived key', async () => {
    const { metadata, dek } = await createEncryptionEnvelope('correct encryption passphrase');
    expect(metadata.algorithm).toBe('AES-256-GCM');
    expect(metadata.version).toBe(1);
    expect(metadata.salt).toMatch(/^[a-f0-9]{32}$/);

    const envelope = await encryptPayload(dek, { title: 'Private', body: 'Sensitive text', tags: 'personal' });
    expect(envelope).not.toHaveProperty('title');
    expect(envelope).not.toHaveProperty('body');

    const decrypted = await decryptPayload(dek, envelope);
    expect(decrypted).toEqual({ title: 'Private', body: 'Sensitive text', tags: 'personal' });
  });

  it('fails safely with an incorrect encryption passphrase', async () => {
    const { metadata } = await createEncryptionEnvelope('correct encryption passphrase');
    await expect(unwrapEncryptionKey('wrong encryption passphrase', metadata))
      .rejects.toThrow('incorrect');
  });

  it('uses a fresh 96-bit IV for each encryption operation', async () => {
    const { dek } = await createEncryptionEnvelope('unique vector passphrase');
    const first = await encryptPayload(dek, { body: 'one' });
    const second = await encryptPayload(dek, { body: 'two' });
    expect(first.iv).not.toBe(second.iv);
  });
});
