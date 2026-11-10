'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { CalledClient, CalledContract, LiveClient, type Me } from '@called/sdk';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { apiBase, config, liveUrl } from './config';

const TOKEN_KEY = 'called.token';

interface Session {
  api: CalledClient;
  live: LiveClient;
  contract: CalledContract | null;
  me: Me | null | undefined;
  token: string | undefined;
  setToken: (t: string | undefined) => void;
  signOut: () => void;
}

const tokenListeners = new Set<() => void>();
function subscribeToken(fn: () => void) {
  tokenListeners.add(fn);
  window.addEventListener('storage', fn);
  return () => { tokenListeners.delete(fn); window.removeEventListener('storage', fn); };
}
const readToken = (): string | undefined => window.localStorage.getItem(TOKEN_KEY) ?? undefined;

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside <Providers>');
  return s;
}

function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const token = useSyncExternalStore(subscribeToken, readToken, () => undefined);
  const api = useMemo(() => new CalledClient({ baseUrl: apiBase() }), []);
  api.setToken(token);
  const live = useMemo(() => new LiveClient({ url: liveUrl(), token }), [token]);
  useEffect(() => () => live.close(), [live]);
  const contract = useMemo(() => (config.contractId ? new CalledContract(config.contractId, config.rpcUrl) : null), []);

  const setToken = useCallback((t: string | undefined) => {
    if (t) window.localStorage.setItem(TOKEN_KEY, t); else window.localStorage.removeItem(TOKEN_KEY);
    api.setToken(t);
    for (const fn of tokenListeners) fn();
    void qc.invalidateQueries();
  }, [api, qc]);

  const meQ = useQuery({ queryKey: ['me', token], queryFn: () => api.me().catch(() => null), enabled: !!token });
  const me = token ? meQ.data : null;
  const value = useMemo<Session>(() => ({ api, live, contract, me, token, setToken, signOut: () => setToken(undefined) }), [api, live, contract, me, token, setToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 } } }));
  return (
    <QueryClientProvider client={qc}>
      {config.privyAppId ? (
        <PrivyProvider appId={config.privyAppId} config={{ loginMethods: ['email', 'google', 'apple', 'sms'], appearance: { theme: 'dark', accentColor: '#7c5cff', logo: undefined, landingHeader: 'Sign in to Called' }, embeddedWallets: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } } }}>
          <SessionProvider>{children}</SessionProvider>
        </PrivyProvider>
      ) : <SessionProvider>{children}</SessionProvider>}
    </QueryClientProvider>
  );
}
