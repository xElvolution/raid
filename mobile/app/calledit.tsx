import React, { useEffect, useMemo } from 'react';
import { View, useWindowDimensions, Pressable, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, withRepeat, Easing, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { D, M, Btn, Record, win } from '../src/ui';
import { brand, F } from '../src/theme';
import { naira } from '../src/api';

const COLORS = [brand.yes, '#fff', '#000', brand.gold, brand.no];
function Bit({ i, W, H }: { i: number; W: number; H: number }) {
  const r = useMemo(() => ({ x: Math.random() * W, d: Math.random() * 900, rot: Math.random() * 720, s: 6 + Math.random() * 8, drift: (Math.random() - 0.5) * 120 }), [W]);
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(r.d, withTiming(1, { duration: 2200 + Math.random() * 1200, easing: Easing.out(Easing.quad) })); }, [t, r]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -40 + t.value * (H + 80) }, { translateX: t.value * r.drift }, { rotate: `${t.value * r.rot}deg` }], opacity: 1 - t.value * 0.3 }));
  return <Animated.View style={[{ position: 'absolute', left: r.x, top: 0, width: r.s, height: r.s * 0.5, backgroundColor: COLORS[i % COLORS.length] }, a]} />;
}

export default function CalledIt() {
  const { q, amt } = useLocalSearchParams<{ q?: string; amt?: string }>();
  const { width, height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const x = useSharedValue(0);
  useEffect(() => { win(); x.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1); }, [x]);
  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value * 260 }, { rotate: '-12deg' }] }));
  const n = Number(amt ?? 7042);
  return (
    <View style={{ flex: 1, backgroundColor: brand.purple, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: -80, left: -60, width: width * 3 }, drift]}>
        {Array.from({ length: 12 }, (_, i) => <D key={i} size={92} color="transparent" style={{ fontFamily: F.display, color: 'transparent', textShadowColor: 'rgba(255,255,255,.35)', textShadowRadius: 1, opacity: 0.6, ...( { WebkitTextStroke: '1.5px rgba(255,255,255,.45)' } as object) }}>{'CALLED IT CALLED IT CALLED IT'}</D>)}
      </Animated.View>
      {Array.from({ length: 70 }, (_, i) => <Bit key={i} i={i} W={width} H={height} />)}
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: ins.bottom + 16, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={ZoomIn.springify().damping(9)}><D size={110} color="#000" style={{ transform: [{ rotate: '-4deg' }] }}>Called it!</D></Animated.View>
        <Animated.View entering={ZoomIn.delay(250).springify().damping(14)} style={{ backgroundColor: '#000', marginTop: 16 }}>
          <View style={{ flexDirection: 'row' }}><View style={{ backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4 }}><M bold color="#000">FULL TIME</M></View><View style={{ backgroundColor: brand.yes, paddingHorizontal: 8, paddingVertical: 4 }}><M bold color="#000">YES ✓</M></View></View>
          <View style={{ padding: 14, gap: 6 }}>
            <M color="#bbb" numberOfLines={2}>{q ?? 'Will GTA VI launch on its announced date?'}</M>
            <M bold color="#fff">YOU WON</M>
            <D size={64} color={brand.yes}>+{naira(n)}</D>
            <Record items={Array.from({ length: 30 }, (_, i) => i % 4 !== 1)} size={8} />
          </View>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Btn style={{ flex: 1 }} label="Post the receipt ›" bg="#000" onPress={() => Share.share({ message: `CALLED IT on Called: ${q ?? ''} +${naira(n)}` }).catch(() => {})} />
          <Pressable onPress={() => router.back()} style={{ width: 56, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><D size={24} color="#000">✕</D></Pressable>
        </View>
      </View>
    </View>
  );
}
