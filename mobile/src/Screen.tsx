import React, { useEffect } from 'react';
import { View, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, brand } from './theme';
import { D, M, Btn } from './ui';

/** Fast diagonal purple wipe that crosses the screen when a screen enters. */
export function Wipe() {
  const { width } = useWindowDimensions();
  const x = useSharedValue(-1);
  useEffect(() => { x.value = withTiming(1, { duration: 420, easing: Easing.inOut(Easing.cubic) }); }, [x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width * 1.6 }, { skewX: '-20deg' }], opacity: x.value >= 1 ? 0 : 1 }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: brand.purple, left: -width * 0.1, width: width * 1.2 }, a]} />;
}

export function Screen({ children, title, back, right, wipe = true }: { children: React.ReactNode; title?: string; back?: boolean; right?: React.ReactNode; wipe?: boolean }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.mode === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, paddingTop: ins.top, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {title !== undefined && (
          <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderColor: c.line }}>
            {back && <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}><D size={24}>‹</D></Pressable>}
            <D size={26} style={{ flex: 1 }}>{title}</D>
            {right}
          </View>
        )}
        {children}
      </View>
      {wipe && <Wipe />}
    </View>
  );
}

export function ErrorState({ error, retry }: { error: Error; retry: () => void }) {
  return <View style={{ padding: 24, gap: 12 }}><D size={24}>Signal lost</D><M>{error.message}</M><Btn small label="Retry" onPress={retry} /></View>;
}
