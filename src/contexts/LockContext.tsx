import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

type LockContextType = {
  isLockEnabled: boolean;
  isLocked:      boolean;
  hasPin:        boolean;
  setLockEnabled:(val: boolean) => Promise<void>;
  setPin:        (pin: string)  => Promise<void>;
  verifyPin:     (pin: string)  => Promise<boolean>;
  lockApp:       () => void;
  unlockApp:     () => void;
};

const LockContext = createContext<LockContextType>({} as LockContextType);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isLocked,      setIsLocked]      = useState(false);
  const [hasPin,        setHasPin]        = useState(false);

  useEffect(() => {
    (async () => {
      const enabled = await SecureStore.getItemAsync('lock_enabled');
      const pin     = await SecureStore.getItemAsync('app_pin');
      if (pin)            setHasPin(true);
      if (enabled === 'true') {
        setIsLockEnabled(true);
        setIsLocked(true);
      }
    })();
  }, []);

  const setLockEnabled = async (val: boolean) => {
    await SecureStore.setItemAsync('lock_enabled', val ? 'true' : 'false');
    setIsLockEnabled(val);
    if (!val) setIsLocked(false);
  };

  const setPin = async (pin: string) => {
    await SecureStore.setItemAsync('app_pin', pin);
    setHasPin(true);
  };

  const verifyPin = async (pin: string) => {
    const stored = await SecureStore.getItemAsync('app_pin');
    return stored === pin;
  };

  return (
    <LockContext.Provider value={{
      isLockEnabled, isLocked, hasPin,
      setLockEnabled, setPin, verifyPin,
      lockApp:   () => setIsLocked(true),
      unlockApp: () => setIsLocked(false),
    }}>
      {children}
    </LockContext.Provider>
  );
}

export const useLock = () => useContext(LockContext);