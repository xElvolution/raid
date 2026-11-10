import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, ErrorState } from '../src/Screen';
import { D, M, T, Spark, Skeleton, Btn, tap, win } from '../src/ui';
import { useTheme, brand } from '../src/theme';
import { Api, naira } from '../src/api';
import { useQ } from '../src/hooks';

export default function Portfolio() {
  const { c } = useTheme();
  const q = useQ(() => Api.account());
  const [fb, setFb] = useState<string | null>(null);
  const [fbusy, setFbusy] = useState(false);
  const faucet = async () => { setFbusy(true); setFb(null); try { await Api.faucet(); win(); setFb('Minted 1,000 tUSDC to your account'); q.reload(); } catch (e) { const m = (e as Error).message; setFb(m === 'faucet_cooldown' ? 'Faucet is once every 24 hours. Come back tomorrow.' : m.replace(/_/g, ' ')); } finally { setFbusy(false); } };
  const [tab, setTab] = useState<'open' | 'settled'>('open');
  const a = q.data;
  return (
    <Screen title="Portfolio" back>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !a ? <View style={{ padding: 16, gap: 10 }}><Skeleton h={120} /><Skeleton h={60} /><Skeleton h={60} /></View> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ padding: 16, gap: 4 }}>
            <M bold>VALUE</M><D size={56}>{naira(a.value)}</D>
            <M bold color={a.pnl >= 0 ? brand.yes : brand.no}>{a.pnl >= 0 ? '▲ +' : '▼ −'}{naira(Math.abs(a.pnl))} ALL-TIME</M>
            <Spark data={a.history.map((h) => h.value)} w={340} h={90} color={a.pnl >= 0 ? brand.yes : brand.no} />
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
            {[['CASH', naira(a.balance)], ['IN PLAY', naira(a.positionsValue)], ['DEPOSITED', naira(a.deposited)]].map(([k, v], i) => <View key={k} style={{ flex: 1, padding: 12, borderLeftWidth: i ? 1 : 0, borderColor: c.line }}><M size={9}>{k}</M><D size={22}>{v}</D></View>)}
          </View>
          <View style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderColor: c.line }}>
            <M bold>TEST USDC FAUCET</M><T size={13} color={c.sub}>1,000 tUSDC on NEAR testnet · once every 24 hours · no real value</T>
            {fb && <M bold color={brand.purple}>{fb}</M>}
            <Btn label={fbusy ? 'Minting…' : 'Get 1,000 test USDC ›'} onPress={faucet} disabled={fbusy} />
          </View>
          <View style={{ flexDirection: 'row' }}>{(['open', 'settled'] as const).map((t) => <Pressable key={t} onPress={() => { tap(); setTab(t); }} style={{ padding: 14, borderBottomWidth: 3, borderColor: tab === t ? brand.purple : 'transparent' }}><M bold color={tab === t ? c.text : c.sub}>{t.toUpperCase()} · {(t === 'open' ? a.open : a.settled).length}</M></Pressable>)}</View>
          {(tab === 'open' ? a.open : a.settled).map((p) => {
            const won = (p as { won?: boolean }).won; const pnl = p.pnl ?? 0;
            return <Pressable key={p.market_id + p.outcome} onPress={() => (tab === 'settled' && won ? router.push(`/calledit?q=${encodeURIComponent(p.question)}&amt=${Math.round(p.shares)}`) : router.push(`/market/${p.market_id}`))} style={{ flexDirection: 'row', padding: 16, gap: 10, borderBottomWidth: 1, borderColor: c.line, alignItems: 'center' }}>
              <View style={{ backgroundColor: p.outcome ? brand.yes : brand.no, paddingHorizontal: 6, paddingVertical: 3 }}><M bold color="#000">{p.outcome ? 'YES' : 'NO'}</M></View>
              <View style={{ flex: 1 }}><T size={14}>{p.question}</T><M>{p.shares.toFixed(1)} SH · COST {naira(p.cost)}</M></View>
              <View style={{ alignItems: 'flex-end' }}>{tab === 'settled' ? <D size={18} color={won ? brand.yes : brand.no}>{won ? 'Called it' : 'Missed'}</D> : <D size={20} color={pnl >= 0 ? brand.yes : brand.no}>{pnl >= 0 ? '+' : '−'}{naira(Math.abs(pnl))}</D>}</View>
            </Pressable>;
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
