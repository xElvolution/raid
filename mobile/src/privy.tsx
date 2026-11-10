import React from 'react';
import { Platform } from 'react-native';

/** Privy is native-only (Expo SDK). Web previews fall back to demo sign-in. */
export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? '';
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? '';
export const PRIVY_ON = Platform.OS !== 'web' && !!PRIVY_APP_ID;

export function MaybePrivy({ children }: { children: React.ReactNode }) {
  if (!PRIVY_ON) return <>{children}</>;
  require('fast-text-encoding'); require('react-native-get-random-values'); require('@ethersproject/shims');
  const { PrivyProvider } = require('@privy-io/expo');
  return <PrivyProvider appId={PRIVY_APP_ID} {...(PRIVY_CLIENT_ID ? { clientId: PRIVY_CLIENT_ID } : {})}>{children}</PrivyProvider>;
}
