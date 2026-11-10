import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/Screen';
import { D, M, T, Btn, win } from '../src/ui';
import { useTheme, brand } from '../src/theme';
import { useSession } from '../src/session';
import { DEMO_LOGIN } from '../src/api';
import { PRIVY_ON } from '../src/privy';

function PrivyLogin({ onErr }: { onErr: (m: string | null) => void }) {
  const { c } = useTheme();
  const { privySignIn } = useSession();
  const { useLoginWithEmail, useLoginWithOAuth, getAccessToken } = require('@privy-io/expo');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    const at = await getAccessToken();
    if (!at) throw new Error('No Privy session');
    await privySignIn(at); win(); router.replace('/home');
  };
  const { sendCode, loginWithCode, state } = useLoginWithEmail({ onLoginSuccess: () => finish().catch((e: Error) => onErr(e.message)) });
  const { login: oauth } = useLoginWithOAuth({ onSuccess: () => finish().catch((e: Error) => onErr(e.message)) });
  const run = (f: () => Promise<unknown>) => async () => { setBusy(true); onErr(null); try { await f(); } catch (e) { onErr((e as Error).message); } finally { setBusy(false); } };
  const sent = state?.status === 'awaiting-code-input';
  const box = { borderWidth: 1, borderColor: c.line, color: c.text, padding: 14, fontSize: 16, fontFamily: 'JetBrainsMono_500Medium' } as const;
  return (
    <View style={{ gap: 10 }}>
      <Btn label="Continue with Google" bg={c.text} color={c.invert} disabled={busy} onPress={run(() => oauth({ provider: 'google' }))} />
      {!sent ? <>
        <TextInput style={box} placeholder="you@email.com" placeholderTextColor={c.sub} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Btn label={busy ? 'Sending…' : 'Email me a code ›'} disabled={busy || !email.includes('@')} onPress={run(() => sendCode({ email }))} />
      </> : <>
        <TextInput style={box} placeholder="6-digit code" placeholderTextColor={c.sub} keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
        <Btn label={busy ? 'Checking…' : 'Sign in ›'} disabled={busy || code.length < 6} onPress={run(() => loginWithCode({ code, email }))} />
      </>}
    </View>
  );
}

export default function SignIn() {
  const { c } = useTheme();
  const { demoSignIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const demo = async () => {
    setBusy(true); setErr(null);
    try { await demoSignIn(); win(); router.replace('/home'); } catch (e) { setErr((e as Error).message === 'not_found' ? 'Demo sign-in is off on this server.' : (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 20, gap: 14 }}>
        <View style={{ backgroundColor: brand.purple, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 }}><M bold color="#fff">● NEAR TESTNET</M></View>
        <D size={84}>Sign in to{'\n'}Called</D>
        <T color={c.sub}>Sign in with Google or email. We set up your trading account, then grab free test USDC from the faucet.</T>
        {err && <M color={brand.no}>{err}</M>}
        {PRIVY_ON ? <PrivyLogin onErr={setErr} /> : <M>Google and email sign-in run in the Android app.</M>}
        {DEMO_LOGIN && <Btn label={busy ? 'Going live…' : 'Try the demo account ›'} onPress={demo} disabled={busy} />}
        <M style={{ textAlign: 'center' }}>Test USDC only · No political markets</M>
      </View>
    </Screen>
  );
}
