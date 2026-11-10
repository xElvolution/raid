import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Screen } from '../src/Screen';
import { D, M, T, Btn, Battle, Scoreboard } from '../src/ui';
import { useTheme, brand } from '../src/theme';

const PAGES = [
  { k: 'Make the call', s: 'Pick YES or NO on football, crypto, F1, music, movies and more. Every market is a live battle.', q: 'Arsenal beat Chelsea on Sunday?', y: 58 },
  { k: 'Watch it fight', s: 'Your side grows as the odds move. Scoreboards show the split live: never a score, always the percentage.', q: 'Bitcoin above $150K by Dec 31?', y: 64 },
  { k: 'Called it', s: 'Win the call, get the receipt, climb the board. Settled on NEAR testnet with play money.', q: 'Will GTA VI launch on its announced date?', y: 71 },
];
export default function Onboarding() {
  const [i, setI] = useState(0);
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 480);
  const p = PAGES[i]!;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 4, padding: 16 }}>{PAGES.map((_, j) => <View key={j} style={{ flex: 1, height: 4, backgroundColor: j <= i ? brand.purple : c.line }} />)}</View>
      <Animated.View key={i} entering={FadeInRight.springify().damping(16)} exiting={FadeOutLeft} style={{ flex: 1 }}>
        <Battle question={p.q} yes={p.y} width={w} height={300} seed={i * 13} />
        <Scoreboard yes={p.y} theme={i === 0 ? 'football' : i === 1 ? 'bull' : 'gta'} big />
        <View style={{ padding: 20, gap: 12 }}>
          <M bold color={brand.purple}>0{i + 1} / 03</M>
          <D size={64}>{p.k}</D>
          <T color={c.sub} size={16}>{p.s}</T>
        </View>
      </Animated.View>
      <View style={{ padding: 16, gap: 10 }}>
        <Btn label={i < 2 ? 'Next ›' : 'Get on air ›'} onPress={() => (i < 2 ? setI(i + 1) : router.replace('/signin'))} />
        {i < 2 && <Btn label="Skip" bg={c.card2} color={c.text} small onPress={() => router.replace('/signin')} />}
      </View>
    </Screen>
  );
}
