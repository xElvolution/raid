import React, { useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, ErrorState } from '../../src/Screen';
import { D, M, T, Battle, Scoreboard, Btn, Live, Tag, Spark, Skeleton, tap, win } from '../../src/ui';
import { Sheet } from '../../src/Sheet';
import { useTheme, brand } from '../../src/theme';
import { Api, pct, left, naira } from '../../src/api';
import { themeFor, crewLabels } from '../../src/battle';
import { useQ } from '../../src/hooks';

const AMTS = [10, 50, 100, 250, 500];
export default function MarketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480);
  const q = useQ(() => Api.market(String(id)), [id]);
  const acct = useQ(() => Api.account());
  const [side, setSide] = useState<0 | 1 | null>(null);
  const [amt, setAmt] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const m = q.data;
  if (q.error) return <Screen title="Market" back><ErrorState error={q.error} retry={q.reload} /></Screen>;
  if (!m) return <Screen title="" back><Skeleton h={300} /><View style={{ padding: 16, gap: 10 }}><Skeleton h={40} /><Skeleton h={120} /></View></Screen>;
  const yes = pct(m.price_yes), theme = themeFor(m.question, m.category), [yl, nl] = crewLabels(theme);
  const price = side === 1 ? yes / 100 : (100 - yes) / 100;
  const payout = side === null ? 0 : amt / Math.max(price, 0.01);
  const hist = (m.spark ?? []).map(Number);
  const trade = async () => {
    if (side === null) return;
    setBusy(true); setMsg(null);
    try { await Api.trade({ marketId: m.id, outcome: side, side: 'buy', amount: amt }); win(); setSide(null); setMsg(`Filled on-chain: ${naira(amt)} on ${side ? 'YES' : 'NO'}`); acct.reload(); q.reload(); }
    catch (e) { setMsg((e as Error).message.replace(/_/g, ' ')); } finally { setBusy(false); }
  };
  return (
    <Screen title="" back right={<View style={{ flexDirection: 'row', gap: 6 }}><Live /><Tag label={(m.category ?? theme).toUpperCase()} /></View>}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Battle question={m.question} category={m.category} yes={yes} width={w} height={280} seed={Number(m.id) % 97} />
        <Scoreboard yes={yes} theme={theme} big />
        <View style={{ padding: 16, gap: 10 }}>
          <D size={38}>{m.question}</D>
          <M bold>VOL {naira(Number(m.volume ?? 0) / 1e6)} · ENDS {left(m.close_ts)} · {String(m.venue ?? 'called').toUpperCase()}</M>
          {msg && <View style={{ backgroundColor: brand.purple, padding: 10 }}><M bold color="#fff">{msg}</M></View>}
        </View>
        {hist.length > 1 && <View style={{ marginHorizontal: 16, borderWidth: 1, borderColor: c.line, padding: 12 }}><M bold>YES PRICE · HISTORY</M><Spark data={hist} w={w - 58} h={90} color={brand.purple} /></View>}
        <View style={{ padding: 16, gap: 6 }}><M bold>RULES</M><T color={c.sub} size={13}>{m.rules ?? 'Resolves YES if the event happens as stated before the close time, per the listed source. Otherwise NO.'}</T></View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.line }}>
        <Btn style={{ flex: 1 }} label={`${yl} · ${yes}¢`} bg={brand.yes} color="#000" onPress={() => setSide(1)} />
        <Btn style={{ flex: 1 }} label={`${nl} · ${100 - yes}¢`} bg={brand.no} color="#000" onPress={() => setSide(0)} />
      </View>
      <Sheet open={side !== null} onClose={() => setSide(null)}>
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            {([1, 0] as const).map((s) => <Pressable key={s} onPress={() => { tap(); setSide(s); }} style={{ flex: 1, padding: 10, backgroundColor: side === s ? (s ? brand.yes : brand.no) : c.card2 }}><D size={18} color={side === s ? '#000' : c.text}>{s ? `${yl} · YES ${yes}¢` : `${nl} · NO ${100 - yes}¢`}</D></Pressable>)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View><M bold>STAKE</M><D size={54}>{naira(amt)}</D></View>
            <View style={{ alignItems: 'flex-end' }}><M bold>TO WIN</M><D size={34} color={brand.yes}>{naira(payout)}</D></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>{AMTS.map((a) => <Pressable key={a} onPress={() => { tap(); setAmt(a); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: amt === a ? c.text : c.card2 }}><M bold color={amt === a ? c.invert : c.text}>{a}</M></Pressable>)}</View>
          <M>BALANCE {acct.data ? naira(acct.data.balance) : '—'} · TEST USDC · NEAR TESTNET</M>
          <Btn label={busy ? 'Placing…' : side === 1 ? `Ride with the ${yl.replace('YES ', '').toLowerCase()} ›` : `Back the ${nl.replace('NO ', '').toLowerCase()} ›`} onPress={trade} disabled={busy} />
          <Pressable onPress={() => router.push(`/calledit?q=${encodeURIComponent(m.question)}&amt=${Math.round(payout)}`)}><M style={{ textAlign: 'center' }}>Preview the CALLED IT screen</M></Pressable>
        </View>
      </Sheet>
    </Screen>
  );
}
