import React, { createContext, useContext, useEffect, useState } from 'react';
import { Api, loadToken, setToken, User } from './api';
const Ctx = createContext<{ user: User | null; ready: boolean; demoSignIn: () => Promise<void>; privySignIn: (accessToken: string) => Promise<void>; signOut: () => Promise<void>; onboarded: boolean; setOnboarded: (v: boolean) => void }>(null as never);
export const useSession = () => useContext(Ctx);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  useEffect(() => { (async () => { try { if (await loadToken()) setUser(await Api.me()); } catch { await setToken(null); } setReady(true); })(); }, []);
  const demoSignIn = async () => { const r = await Api.demo(); await setToken(r.token); setUser(r.user); };
  const privySignIn = async (at: string) => { const r = await Api.privy(at); await setToken(r.token); setUser(await Api.me().catch(() => r.user as User)); };
  const signOut = async () => { await setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, ready, demoSignIn, privySignIn, signOut, onboarded, setOnboarded }}>{children}</Ctx.Provider>;
}
