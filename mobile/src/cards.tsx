import React from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, brand } from './theme';
import { Battle, Scoreboard, D, M, T, Avatar, Live, Tag, tap } from './ui';
import { Market, Post, pct, left, ago } from './api';
import { themeFor } from './battle';

export function MarketCard({ m, i = 0, hero }: { m: Market; i?: number; hero?: boolean }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480) - 32;
  const yes = pct(m.price_yes);
  return (
    <Animated.View entering={FadeInDown.delay(i * 60).springify().damping(16)}>
      <Pressable onPress={() => { tap(); router.push(`/market/${m.id}`); }} style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}><Live /><Tag label={(m.category ?? themeFor(m.question, m.category)).toUpperCase()} /></View>
          <M bold color={c.text}>⏱ {left(m.close_ts)}</M>
        </View>
        <Battle question={m.question} category={m.category} yes={yes} width={w - 2} height={hero ? 200 : 130} seed={Number(m.id) % 97} />
        <Scoreboard yes={yes} theme={themeFor(m.question, m.category)} big={hero} />
        <View style={{ padding: 12 }}><D size={hero ? 30 : 20}>{m.question}</D></View>
      </Pressable>
    </Animated.View>
  );
}

export function PostCard({ p, i = 0 }: { p: Post; i?: number }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480) - 32 - 46;
  const yes = pct(p.price_yes);
  return (
    <Animated.View entering={FadeInDown.delay(i * 50).springify().damping(16)} style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: c.line, gap: 10 }}>
      <Pressable onPress={() => router.push(`/u/${p.handle}`)}><Avatar uri={p.avatar_url} name={p.display_name} /></Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><T bold>{p.display_name}</T><M>@{p.handle} · {ago(p.created_at)}</M></View>
        <T style={{ marginTop: 2 }}>{p.body}</T>
        {p.market_id && p.question ? (
          <Pressable onPress={() => router.push(`/market/${p.market_id}`)} style={{ marginTop: 10, borderWidth: 1, borderColor: c.line }}>
            <Battle question={p.question} category={p.market_category} yes={yes} width={w} height={96} seed={Number(p.market_id) % 97} />
            <Scoreboard yes={yes} theme={themeFor(p.question, p.market_category)} />
            <View style={{ padding: 8, backgroundColor: c.card }}><T bold size={13}>{p.question}</T></View>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 22, marginTop: 10 }}>
          <M>↩ {p.replies ?? 0}</M><M>⟲ {p.recasts ?? 0}</M><M color={p.liked ? brand.no : c.sub}>♥ {p.likes ?? 0}</M>
        </View>
      </View>
    </Animated.View>
  );
}
