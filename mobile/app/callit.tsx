import React, { useState } from 'react';
import { View, TextInput, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '../src/Screen';
import { D, M, T, Btn, Battle, Scoreboard, Live, Skeleton, win, tap } from '../src/ui';
import { useTheme, brand, F } from '../src/theme';
import { Api } from '../src/api';
import { themeFor } from '../src/battle';

const IDEAS = ['Super Eagles qualify for the World Cup', 'ETH above $8K by June', 'Davido x Wizkid collab drops this year', 'Starship reaches orbit before March'];
export default function CallIt() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof Api.preview>> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const draft = async () => {
    if (text.trim().length < 6) return;
    setBusy(true); setErr(null); setRes(null);
    try { const r = await Api.preview(text.trim()); setRes(r); if (r.draft) win(); } catch (e) { setErr((e as Error).message === 'drafter_unavailable' ? 'The AI drafter is offline on this server. Try again later.' : (e as Error).message.replace(/_/g, ' ')); } finally { setBusy(false); }
  };
  const goLive = async () => { try { await Api.post(text.trim()); setPosted(true); win(); setTimeout(() => router.back(), 900); } catch (e) { setErr((e as Error).message); } };
  const d = res?.draft;
  return (
    <Screen title="Call it" back right={<View style={{ backgroundColor: brand.purple, paddingHorizontal: 6, paddingVertical: 2 }}><M bold color="#fff">AI</M></View>}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <M bold>YOUR TAKE</M>
        <TextInput value={text} onChangeText={setText} multiline placeholder="BURNA BOY DROPS AN ALBUM BEFORE 2027" placeholderTextColor={c.line} style={{ fontFamily: F.display, fontSize: 40, lineHeight: 40, color: c.text, minHeight: 130, textTransform: 'uppercase', textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{IDEAS.map((i) => <Pressable key={i} onPress={() => { tap(); setText(i); }} style={{ backgroundColor: c.card2, paddingHorizontal: 8, paddingVertical: 6 }}><M bold color={c.text}>+ {i}</M></Pressable>)}</View>
        {busy && <View style={{ gap: 8 }}><Skeleton h={160} /><Skeleton h={60} /></View>}
        {err && <M color={brand.no}>{err}</M>}
        {res && !d && <View style={{ borderWidth: 1, borderColor: brand.no, padding: 12 }}><M bold color={brand.no}>{res.status === 'policy' ? 'NOT ALLOWED' : 'TOO VAGUE'}</M><T>{res.message ?? 'Add a clear outcome and a date so it can be settled.'}</T></View>}
        {d && (
          <Animated.View entering={FadeInUp.springify().damping(15)} style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}><Live label="DRAFTED" /><M>PREVIEW</M></View>
            <Battle question={d.question} category={d.category} yes={50} width={Math.min(width, 480) - 34} height={140} />
            <Scoreboard yes={50} theme={themeFor(d.question, d.category)} />
            <View style={{ padding: 12, gap: 8 }}>
              <T bold size={16}>{d.question}</T>
              {d.rules ? <><M bold>RESOLVES</M><T size={13} color={c.sub}>{d.rules}</T></> : null}
              {d.close_ts ? <><M bold>CLOSES</M><M color={c.text}>{new Date(d.close_ts).toUTCString()}</M></> : null}
            </View>
          </Animated.View>
        )}
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.line }}>
        {d ? <Btn label={posted ? 'On air ✓' : 'Go live ›'} onPress={goLive} /> : <Btn label={busy ? 'Drafting…' : 'Draft with AI ›'} onPress={draft} disabled={busy || text.trim().length < 6} />}
      </View>
    </Screen>
  );
}
