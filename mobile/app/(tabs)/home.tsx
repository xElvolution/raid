import React from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Screen, ErrorState } from '../../src/Screen';
import { D, M, T, Avatar, Spark, Skeleton, SectionHead, Live, Cut } from '../../src/ui';
import { MarketCard, PostCard } from '../../src/cards';
import { useTheme, brand } from '../../src/theme';
import { Api, naira, pct } from '../../src/api';
import { useQ } from '../../src/hooks';

export default function Home() {
  const { c, setPref } = useTheme();
  const acct = useQ(() => Api.account());
  const mk = useQ(() => Api.markets('sort=volume'));
  const top = useQ(() => Api.top());
  const feed = useQ(() => Api.feed());
  const markets = (mk.data?.items ?? []).filter((m) => m.status === 'open');
  const a = acct.data;
  const up = (a?.pnl ?? 0) >= 0;
  const reload = () => { acct.reload(); mk.reload(); top.reload(); feed.reload(); };
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, gap: 8 }}>
        <D size={30}>Called</D><View style={{ width: 3, height: 24, backgroundColor: brand.purple, transform: [{ skewX: '-20deg' }] }} /><D size={30} color={brand.purple}>Live</D>
        <View style={{ flex: 1 }} />
        <Pressable onPress={(e) => setPref(c.mode === 'dark' ? 'light' : 'dark', { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })} hitSlop={8} style={{ borderWidth: 1, borderColor: c.line, paddingHorizontal: 8, paddingVertical: 5 }}><M bold color={c.text}>{c.mode === 'dark' ? '☾' : '☀'}</M></Pressable>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={{ borderWidth: 1, borderColor: c.line, paddingHorizontal: 8, paddingVertical: 5 }}><M bold color={c.text}>🔔</M></Pressable>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={brand.purple} />} contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.push('/portfolio')} style={{ marginHorizontal: 16 }}>
          <Cut bg={c.card} border={c.line} cut={14} style={{ padding: 14 }}>
            {!a ? <Skeleton h={70} /> : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <M bold>BALANCE · PLAY</M>
                  <D size={44}>{naira(a.value)}</D>
                  <M bold color={up ? brand.yes : brand.no}>{up ? '▲' : '▼'} {naira(Math.abs(a.pnl))} ALL-TIME · {a.pnlToday >= 0 ? '+' : '−'}{naira(Math.abs(a.pnlToday))} TODAY</M>
                </View>
                <Spark data={a.history.map((h) => h.value)} w={110} h={46} color={up ? brand.yes : brand.no} />
              </View>
            )}
          </Cut>
        </Pressable>
        {acct.error && <ErrorState error={acct.error} retry={acct.reload} />}

        <SectionHead title="Main event" right="LIVE NOW" />
        {mk.loading && !mk.data ? <Skeleton h={300} style={{ marginHorizontal: 16 }} /> : markets[0] ? <MarketCard m={markets[0]} hero /> : mk.error ? <ErrorState error={mk.error} retry={mk.reload} /> : null}

        <SectionHead title="Top callers" right="THIS WEEK" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {(top.data?.items ?? []).slice(0, 8).map((t, i) => (
            <Pressable key={t.handle} onPress={() => router.push(`/u/${t.handle}`)} style={{ width: 120, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 10, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Avatar uri={t.avatar_url} name={t.display_name} size={34} /><D size={26} color={brand.purple}>#{i + 1}</D></View>
              <T bold size={13} numberOfLines={1}>{t.display_name}</T>
              <M bold color={t.pnl >= 0 ? brand.yes : brand.no}>{t.pnl >= 0 ? '+' : ''}{Math.round(t.pnlPct * 100)}%</M>
            </Pressable>
          ))}
          {!top.data && [0, 1, 2].map((k) => <Skeleton key={k} w={120} h={100} />)}
        </ScrollView>

        <SectionHead title="Up next" right="TRENDING" />
        {markets.slice(1, 6).map((m) => (
          <Pressable key={m.id} onPress={() => router.push(`/market/${m.id}`)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line, gap: 10 }}>
            <Live label="●" />
            <T style={{ flex: 1 }} numberOfLines={2} size={13}>{m.question}</T>
            <D size={24} color={pct(m.price_yes) >= 50 ? brand.yes : brand.no}>{pct(m.price_yes)}%</D>
          </Pressable>
        ))}

        <SectionHead title="The feed" right="FOR YOU" />
        {(feed.data?.items ?? []).slice(0, 5).map((p, i) => <PostCard key={p.id} p={p} i={i} />)}
        {feed.loading && !feed.data && <Skeleton h={160} style={{ marginHorizontal: 16 }} />}
      </ScrollView>
    </Screen>
  );
}
