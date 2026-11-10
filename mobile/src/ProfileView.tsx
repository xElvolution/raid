import React, { useState } from 'react';
import { View, Pressable, useWindowDimensions, Image, Modal } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useTheme, brand } from './theme';
import { D, M, T, Avatar, Record, Skeleton, tap, Battle } from './ui';
import { PostCard } from './cards';
import { ErrorState, Wipe } from './Screen';
import { Api, img, naira, pct, FullProfile } from './api';
import { useQ } from './hooks';

const TABS = ['Posts', 'Replies', 'Calls', 'History', 'Created', 'Likes'] as const;
const BANNER = 150;
const league = (pnl: number) => (pnl >= 1000 ? ['DIAMOND', '#7FD8FF'] : pnl >= 500 ? ['GOLD', '#F5B93A'] : pnl >= 100 ? ['SILVER', '#C9CCD6'] : ['BRONZE', '#D98A4A']) as [string, string];

function Pnl({ handle }: { handle: string }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState('1w');
  const q = useQ(() => Api.equity(handle, range), [handle, range]);
  const w = Math.min(width, 480) - 32, h = 120;
  const pts = q.data?.points ?? [];
  const base = q.data?.baseline ?? 0;
  const vals = pts.map((p) => p.v), mn = Math.min(base, ...vals), mx = Math.max(base, ...vals), r = mx - mn || 1;
  const y = (v: number) => h - ((v - mn) / r) * (h - 8) - 4;
  const last = vals[vals.length - 1] ?? base, d = last - (vals[0] ?? base), up = last >= base;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View><D size={22}>P&L</D><M>VS DEPOSIT LINE</M></View>
        <View style={{ alignItems: 'flex-end' }}><D size={34} color={up ? brand.yes : brand.no}>{up ? '+' : '−'}{naira(Math.abs(last - base))}</D><M bold color={d >= 0 ? brand.yes : brand.no}>{d >= 0 ? '+' : '−'}{naira(Math.abs(d))} THIS {range.toUpperCase()}</M></View>
      </View>
      <View style={{ height: h, marginTop: 10, justifyContent: 'center' }}>
        {q.loading ? <Skeleton h={h} /> : pts.length < 2 ? <M style={{ textAlign: 'center' }}>No trades in this window yet.</M> : (
          <Svg width={w - 24} height={h}>
            <Line x1={0} x2={w} y1={y(base)} y2={y(base)} stroke={c.sub} strokeDasharray="4 4" strokeWidth={1} />
            <Polyline points={pts.map((p, i) => `${(i / (pts.length - 1)) * (w - 24)},${y(p.v)}`).join(' ')} fill="none" stroke={up ? brand.yes : brand.no} strokeWidth={2} />
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {['1d', '1w', '1m', 'all'].map((k) => <Pressable key={k} onPress={() => { tap(); setRange(k); }} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: range === k ? c.text : c.card2 }}><M bold color={range === k ? c.invert : c.text}>{k.toUpperCase()}</M></Pressable>)}
      </View>
    </View>
  );
}

function TabBody({ handle, tab }: { handle: string; tab: (typeof TABS)[number] }) {
  const { c } = useTheme();
  const q = useQ<{ items: any[] }>(() => (tab === 'Posts' || tab === 'Replies' || tab === 'Likes' ? Api.userPosts(handle, tab.toLowerCase()) : tab === 'Calls' ? Api.userCalls(handle) : tab === 'History' ? Api.userHistory(handle) : Api.userCreated(handle)), [handle, tab]);
  if (q.error) return <ErrorState error={q.error} retry={q.reload} />;
  if (q.loading) return <View style={{ padding: 16, gap: 10 }}><Skeleton h={90} /><Skeleton h={90} /></View>;
  const items = q.data?.items ?? [];
  if (!items.length) return <View style={{ padding: 32, alignItems: 'center' }}><D size={22}>Nothing yet</D><M>No {tab.toLowerCase()} on this profile.</M></View>;
  if (tab === 'Posts' || tab === 'Replies' || tab === 'Likes') return <>{items.map((p, i) => <PostCard key={p.id} p={p} i={i} />)}</>;
  return <>{items.map((m: any) => {
    const right = tab === 'Calls' ? `${m.outcome ? 'YES' : 'NO'} · ${m.pnl >= 0 ? '+' : '−'}${naira(Math.abs(m.pnl))}` : tab === 'History' ? (m.won ? 'CALLED IT' : 'MISSED') : `${pct(m.price_yes)}% YES`;
    const col = tab === 'History' ? (m.won ? brand.yes : brand.no) : tab === 'Calls' ? (m.pnl >= 0 ? brand.yes : brand.no) : c.text;
    return <Pressable key={(m.market_id ?? m.id) + right} onPress={() => router.push(`/market/${m.market_id ?? m.id}`)} style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: c.line, gap: 10, alignItems: 'center' }}>
      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: col }} />
      <T style={{ flex: 1 }} size={14}>{m.question}</T><M bold color={col}>{right}</M>
    </Pressable>;
  })}</>;
}

function CallerCard({ p, onClose }: { p: FullProfile; onClose: () => void }) {
  const [lg, lc] = league(p.stats.pnl);
  const rate = p.stats.winRate === null ? '—' : String(Math.round(p.stats.winRate * 100));
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Animated.View entering={ZoomIn.springify().damping(13)} style={{ width: 300, borderWidth: 6, borderColor: lc, backgroundColor: brand.purple, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><D size={18} color="#fff">Called · S1</D><View style={{ backgroundColor: lc, paddingHorizontal: 6 }}><D size={16} color="#000">{lg}</D></View></View>
          <View style={{ marginTop: 8, height: 250, backgroundColor: '#000' }}>
            {p.user.avatar_url ? <Image source={{ uri: img(p.user.avatar_url) }} style={{ width: '100%', height: '100%' }} /> : null}
            <D size={64} color="#fff" style={{ position: 'absolute', left: 8, top: 6 }}>{rate}</D>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.75)', padding: 8 }}><D size={30} color="#fff">{p.user.display_name}</D><M color="#ddd">@{p.user.handle}</M></View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            {[['CALLED', p.stats.called], ['SETTLED', p.stats.settled], ['RANK', p.stats.rank ? `#${p.stats.rank}` : '—']].map(([k, v]) => <View key={String(k)}><M color="#eee">{k}</M><D size={30} color="#fff">{String(v)}</D></View>)}
          </View>
        </Animated.View>
        <M style={{ marginTop: 16 }} bold color="#fff">CLOSE</M>
      </Pressable>
    </Modal>
  );
}

export function ProfileView({ handle, me }: { handle: string; me?: boolean }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 480);
  const q = useQ(() => Api.profile(handle), [handle]);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Posts');
  const [card, setCard] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const sy = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { sy.value = e.contentOffset.y; });
  const bannerA = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(sy.value, [-100, 0, BANNER], [-50, 0, BANNER * 0.5], Extrapolation.CLAMP) }, { scale: interpolate(sy.value, [-100, 0], [1.6, 1], Extrapolation.CLAMP) }] }));
  const avatarA = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(sy.value, [0, 80], [1, 0.6], Extrapolation.CLAMP) }, { translateY: interpolate(sy.value, [0, 80], [0, 18], Extrapolation.CLAMP) }] }));
  const barA = useAnimatedStyle(() => ({ opacity: interpolate(sy.value, [BANNER - 40, BANNER + 20], [0, 1], Extrapolation.CLAMP) }));
  if (q.error) return <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top }}><ErrorState error={q.error} retry={q.reload} /></View>;
  const p = q.data;
  const u = p?.user;
  const [lg, lc] = league(p?.stats.pnl ?? 0);
  const isF = following ?? u?.am_following ?? false;
  const joined = u?.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null;
  const theme = (p?.battle[0]?.theme ?? 'football') as string;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: BANNER + ins.top, backgroundColor: brand.purple }, bannerA]}>
          {u?.cover_url ? <Image source={{ uri: img(u.cover_url) }} style={{ width: '100%', height: '100%' }} /> : <Battle question={theme === 'bull' ? 'bitcoin' : theme === 'f1' ? 'f1 grand prix' : 'match win'} yes={58} width={W} height={BANNER + ins.top} />}
        </Animated.View>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 60 }}>
          <View>
            <View style={{ height: BANNER + ins.top }} />
            <View style={{ backgroundColor: c.bg, paddingHorizontal: 16, paddingBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 52 }}>
                <Animated.View style={[{ marginTop: -46, borderWidth: 4, borderColor: c.bg, borderRadius: 52, alignSelf: 'flex-start' }, avatarA]}>
                  {u ? <Avatar uri={u.avatar_url} name={u.display_name} size={88} /> : <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.card2 }} />}
                </Animated.View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!me && <Pressable onPress={() => tap()} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><M color={c.text}>✉</M></Pressable>}
                  <Pressable onPress={() => { tap('medium'); if (me) router.push('/settings'); else { setFollowing(!isF); if (!isF) Api.follow(handle).catch(() => setFollowing(false)); } }}
                    style={{ height: 38, paddingHorizontal: 18, borderRadius: 19, justifyContent: 'center', backgroundColor: me || isF ? 'transparent' : c.text, borderWidth: 1, borderColor: me || isF ? c.line : c.text }}>
                    <T bold color={me || isF ? c.text : c.invert}>{me ? 'Edit profile' : isF ? 'Following' : 'Follow'}</T>
                  </Pressable>
                </View>
              </View>
              {!u ? <View style={{ gap: 8, marginTop: 10 }}><Skeleton h={24} w="50%" /><Skeleton h={14} w="30%" /><Skeleton h={40} /></View> : (
                <Animated.View entering={FadeIn} style={{ marginTop: 10, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T bold size={22}>{u.display_name}</T><View style={{ backgroundColor: lc, paddingHorizontal: 6, paddingVertical: 2 }}><M bold size={10} color="#000">{lg}</M></View></View>
                  <M size={13}>@{u.handle}</M>
                  {u.bio ? <T size={15}>{u.bio}</T> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                    {u.location ? <T size={13} color={c.sub}>⌖ {u.location}</T> : null}
                    {u.links?.[0] ? <T size={13} color={brand.purple}>↗ {u.links[0].replace(/^https?:\/\//, '')}</T> : null}
                    {joined ? <T size={13} color={c.sub}>▦ Joined {joined}</T> : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}><T size={14}><T bold size={14}>{u.following}</T> <T size={14} color={c.sub}>Following</T></T><T size={14}><T bold size={14}>{u.followers}</T> <T size={14} color={c.sub}>Followers</T></T></View>
                </Animated.View>
              )}
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, marginTop: 10, backgroundColor: c.bg }}>
              {[['WIN RATE', p?.stats.winRate == null ? '—' : `${Math.round(p.stats.winRate * 100)}%`], ['P&L', p ? `${p.stats.pnl >= 0 ? '+' : '−'}${naira(Math.abs(p.stats.pnl))}` : '—'], ['STREAK', `${u?.streak ?? 0}D`], ['RANK', p?.stats.rank ? `#${p.stats.rank}` : '—']].map(([k, v], i) => (
                <View key={k} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
                  <D size={24} color={k === 'P&L' && p ? (p.stats.pnl >= 0 ? brand.yes : brand.no) : c.text}>{v}</D><M size={9}>{k}</M>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: c.bg }}>
              <Pnl handle={handle} />
              <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View><D size={18}>Call record</D><M>LAST {Math.min(30, p?.record.length ?? 0)} · {p?.record.filter((r) => r.won).length ?? 0}W {p?.record.filter((r) => !r.won).length ?? 0}L</M></View>
                <Pressable onPress={() => { tap(); setCard(true); }} style={{ borderWidth: 1, borderColor: brand.purple, paddingHorizontal: 10, paddingVertical: 6 }}><M bold color={brand.purple}>VIEW CALLER CARD</M></Pressable>
              </View>
              <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 12 }}><Record items={(p?.record ?? []).slice(0, 30).reverse().map((r) => r.won)} size={8} /></View>
            </View>
          </View>
          <View style={{ backgroundColor: c.bg, borderBottomWidth: 1, borderColor: c.line, paddingTop: 0 }}>
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TABS.map((t) => <Pressable key={t} onPress={() => { tap(); setTab(t); }} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderColor: tab === t ? brand.purple : 'transparent' }}><T bold={tab === t} color={tab === t ? c.text : c.sub}>{t}</T></Pressable>)}
            </Animated.ScrollView>
          </View>
          <TabBody handle={handle} tab={tab} />
        </Animated.ScrollView>
        {/* Collapsed header: fades in once the banner scrolls away. */}
        <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: ins.top, height: ins.top + 50, backgroundColor: c.bg, borderBottomWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 56 }, barA]}>
          <View><T bold>{u?.display_name}</T><M>{u?.posts ?? 0} POSTS</M></View>
        </Animated.View>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} style={{ position: 'absolute', top: ins.top + 8, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' }}><D size={22} color="#fff">‹</D></Pressable>
        {me && <Pressable onPress={() => router.push('/settings')} style={{ position: 'absolute', top: ins.top + 8, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' }}><M bold color="#fff">⚙</M></Pressable>}
      </View>
      {card && p && <CallerCard p={p} onClose={() => setCard(false)} />}
      <Wipe />
    </View>
  );
}
