import React, { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, brand } from './theme';

/** Bottom sheet with spring open and drag-to-dismiss. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const y = useSharedValue(height);
  useEffect(() => { y.value = open ? withSpring(0, { damping: 18, stiffness: 180 }) : withSpring(height, { damping: 20 }); }, [open, height, y]);
  const pan = Gesture.Pan()
    .onChange((e) => { y.value = Math.max(0, y.value + e.changeY); })
    .onEnd((e) => { if (y.value > 140 || e.velocityY > 800) { y.value = withSpring(height); runOnJS(onClose)(); } else y.value = withSpring(0, { damping: 16 }); });
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dim = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, height], [0.6, 0]) }));
  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]}><Pressable style={{ flex: 1 }} onPress={onClose} /></Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.card, borderTopWidth: 3, borderColor: brand.purple, paddingBottom: ins.bottom + 16, maxWidth: 480, alignSelf: 'center', width: '100%' }, a]}>
          <View style={{ alignItems: 'center', paddingVertical: 10 }}><View style={{ width: 44, height: 4, backgroundColor: c.line }} /></View>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
