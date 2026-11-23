import { createContext, useContext, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { createEncryptionEnvelope, unwrapEncryptionKey } from '../utils/encryption.js';
import { useAuth } from './AuthContext.jsx';

const EncryptionContext = createContext(null);

export function EncryptionProvider({ children }) {
  const { user, refresh } = useAuth();
  const [locked, setLocked] = useState(true);
  const dekRef = useRef(null);

  async function setup(passphrase) {
    const { metadata, dek } = await createEncryptionEnvelope(passphrase);
    await api('/auth/encryption', { method: 'PUT', body: JSON.stringify(metadata) });
    dekRef.current = dek;
    setLocked(false);
    await refresh();
  }

  async function unlock(passphrase) {
    if (!user?.encryptionMetadata?.wrappedDek) throw new Error('Encryption has not been set up for this account.');
    const dek = await unwrapEncryptionKey(passphrase, user.encryptionMetadata);
    dekRef.current = dek;
    setLocked(false);
  }

  function lock() {
    dekRef.current = null;
    setLocked(true);
  }

  return (
    <EncryptionContext.Provider value={{ locked, dek: dekRef.current, setup, unlock, lock }}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (!context) throw new Error('useEncryption must be used within EncryptionProvider');
  return context;
}
