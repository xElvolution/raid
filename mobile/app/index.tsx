import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import { useSession } from '../src/session';
import { D, M } from '../src/ui';
import { brand } from '../src/theme';

export default function Splash() {
  const { ready, user } = useSession();
  const s = useSharedValue(0.6), w = useSharedValue(0);
  useEffect(() => { s.value = withSpring(1, { damping: 9 }); w.value = withDelay(250, withTiming(1, { duration: 500 })); }, [s, w]);
  useEffect(() => { if (!ready) return; const t = setTimeout(() => router.replace(user ? '/home' : '/onboarding'), 1300); return () => clearTimeout(t); }, [ready, user]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const b = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }, a]}>
        <D size={72} color="#fff">CALLED</D><View style={{ width: 6, height: 60, backgroundColor: brand.purple, marginHorizontal: 6, transform: [{ skewX: '-20deg' }] }} /><D size={72} color={brand.purple}>LIVE</D>
      </Animated.View>
      <View style={{ width: 200, height: 4, backgroundColor: '#222', marginTop: 18 }}><Animated.View style={[{ height: 4, backgroundColor: brand.purple }, b]} /></View>
      <M style={{ marginTop: 12 }} color="#9A9AA8">ON AIR · NEAR TESTNET</M>
    </View>
  );
}
