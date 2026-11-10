import React, { useEffect } from 'react';
import { Text, View, Pressable, StyleSheet, TextProps, ViewStyle, Image, StyleProp } from 'react-native';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, F, brand } from './theme';
import { battleSvg, themeFor, crewLabels, Theme } from './battle';
import { img } from './api';

export const tap = (k: 'light' | 'medium' | 'heavy' = 'light') => Haptics.impactAsync(k === 'light' ? Haptics.ImpactFeedbackStyle.Light : k === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
export const win = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export function D({ size = 28, color, style, ...p }: TextProps & { size?: number; color?: string }) {
  const { c } = useTheme();
  return <Text {...p} style={[{ fontFamily: F.display, fontSize: size, lineHeight: size * 0.95, color: color ?? c.text, textTransform: 'uppercase', letterSpacing: 0.2 }, style]} />;
}
export function M({ size = 11, color, bold, style, ...p }: TextProps & { size?: number; color?: string; bold?: boolean }) {
  const { c } = useTheme();
  return <Text {...p} style={[{ fontFamily: bold ? F.monoB : F.mono, fontSize: size, color: color ?? c.sub, letterSpacing: 0.4 }, style]} />;
}
export function T({ size = 14, color, bold, style, ...p }: TextProps & { size?: number; color?: string; bold?: boolean }) {
  const { c } = useTheme();
  return <Text {...p} style={[{ fontFamily: bold ? F.bodyB : F.body, fontSize: size, color: color ?? c.text, lineHeight: size * 1.4 }, style]} />;
}

/** 45° clipped-corner box (top-left + bottom-right cut). */
export function Cut({ children, bg, cut = 10, style, border }: { children?: React.ReactNode; bg: string; cut?: number; style?: StyleProp<ViewStyle>; border?: string }) {
  const [s, setS] = React.useState({ w: 0, h: 0 });
  return (
    <View style={style} onLayout={(e) => setS({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {s.w > 0 && (
        <Svg width={s.w} height={s.h} style={StyleSheet.absoluteFill}>
          <Path d={`M${cut} 0H${s.w}V${s.h - cut}L${s.w - cut} ${s.h}H0V${cut}Z`} fill={bg} stroke={border} strokeWidth={border ? 1 : 0} />
        </Svg>
      )}
      {children}
    </View>
  );
}

export function Btn({ label, onPress, bg = brand.purple, color = '#fff', style, small, disabled }: { label: string; onPress?: () => void; bg?: string; color?: string; style?: StyleProp<ViewStyle>; small?: boolean; disabled?: boolean }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable disabled={disabled} onPressIn={() => { s.value = withSpring(0.95, { damping: 14 }); }} onPressOut={() => { s.value = withSpring(1, { damping: 10 }); }} onPress={() => { tap('medium'); onPress?.(); }} style={style}>
      <Animated.View style={[a, { opacity: disabled ? 0.5 : 1 }]}>
        <Cut bg={bg} cut={small ? 6 : 10} style={{ paddingVertical: small ? 9 : 16, paddingHorizontal: 16, alignItems: 'center' }}>
          <D size={small ? 15 : 20} color={color}>{label}</D>
        </Cut>
      </Animated.View>
    </Pressable>
  );
}

export function Live({ label = 'LIVE' }: { label?: string }) {
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(0.25, { duration: 600 }), withTiming(1, { duration: 600 })), -1); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: brand.purple, paddingHorizontal: 6, paddingVertical: 3, gap: 5, alignSelf: 'flex-start' }}>
      <Animated.View style={[{ width: 6, height: 6, backgroundColor: '#fff' }, a]} />
      <M size={10} bold color="#fff">{label}</M>
    </View>
  );
}
export function Tag({ label, color }: { label: string; color?: string }) {
  const { c } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: color ?? c.line, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}><M size={10} bold color={color ?? c.text}>{label}</M></View>;
}

/** Scoreboard bug: YES CREW | 71% | 29% | NO CREW. Never a score. */
export function Scoreboard({ yes, theme, big }: { yes: number; theme: Theme; big?: boolean }) {
  const [yl, nl] = crewLabels(theme);
  const h = big ? 64 : 40;
  return (
    <View style={{ flexDirection: 'row', height: h }}>
      <View style={{ backgroundColor: brand.yes, justifyContent: 'center', paddingHorizontal: 8 }}><M size={big ? 11 : 9} bold color="#000">{yl}</M></View>
      <View style={{ flex: Math.max(yes, 28), minWidth: big ? 96 : 64, backgroundColor: '#000', justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 3, borderColor: brand.yes }}><D numberOfLines={1} size={big ? 52 : 28} color={brand.yes}>{yes}%</D></View>
      <View style={{ flex: Math.max(100 - yes, 28), minWidth: big ? 96 : 64, backgroundColor: '#000', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 8, borderBottomWidth: 3, borderColor: brand.no }}><D numberOfLines={1} size={big ? 52 : 28} color={brand.no}>{100 - yes}%</D></View>
      <View style={{ backgroundColor: brand.no, justifyContent: 'center', paddingHorizontal: 8 }}><M size={big ? 11 : 9} bold color="#000">{nl}</M></View>
    </View>
  );
}

export function Battle({ question, category, yes, width, height, seed }: { question: string; category?: string | null; yes: number; width: number; height: number; seed?: number }) {
  const theme = themeFor(question, category);
  const bob = useSharedValue(0);
  useEffect(() => { bob.value = withRepeat(withTiming(1, { duration: 900 }), -1, true); }, [bob]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * -2 }] }));
  const xml = React.useMemo(() => battleSvg({ theme, yes: Math.min(85, Math.max(15, yes)), seed }, { w: Math.round(width), h: Math.round(height), st: 'hard' }), [theme, yes, width, height, seed]);
  return <Animated.View style={[{ width, height, overflow: 'hidden', backgroundColor: '#000' }, a]}><SvgXml xml={xml} width={width} height={height} /></Animated.View>;
}

export function Avatar({ uri, name, size = 36, round = true }: { uri?: string | null; name?: string; size?: number; round?: boolean }) {
  const { c } = useTheme();
  const [bad, setBad] = React.useState(false);
  const r = round ? size / 2 : 0;
  if (uri && !bad) return <Image source={{ uri: img(uri) }} onError={() => setBad(true)} style={{ width: size, height: size, borderRadius: r, backgroundColor: c.card2 }} />;
  return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: brand.purple, alignItems: 'center', justifyContent: 'center' }}><D size={size * 0.5} color="#fff">{(name ?? '?')[0]}</D></View>;
}

export function Spark({ data, w, h, color }: { data: number[]; w: number; h: number; color: string }) {
  if (data.length < 2) return <View style={{ width: w, height: h }} />;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 4) - 2}`).join(' ');
  return <Svg width={w} height={h}><Polyline points={pts} fill="none" stroke={color} strokeWidth={2} /></Svg>;
}

/** Green/red call record tiles. */
export function Record({ items, size = 9 }: { items: boolean[]; size?: number }) {
  const { c } = useTheme();
  const cells = Array.from({ length: 30 }, (_, i) => items[i]);
  return <Svg width={30 * (size + 2)} height={size * 2}>{cells.map((v, i) => <Rect key={i} x={i * (size + 2)} y={v === undefined ? size : v ? 0 : size / 2} width={size} height={v === undefined ? size : v ? size * 2 : size * 1.5} fill={v === undefined ? c.line : v ? brand.yes : brand.no} />)}</Svg>;
}

export function Skeleton({ h = 80, w = '100%' as `${number}%` | number, style }: { h?: number; w?: `${number}%` | number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const o = useSharedValue(0.4);
  useEffect(() => { o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height: h, width: w, backgroundColor: c.card2 }, a, style]} />;
}

export function Rule() { const { c } = useTheme(); return <View style={{ height: 1, backgroundColor: c.line }} />; }
export function SectionHead({ title, right }: { title: string; right?: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 22, marginBottom: 10 }}><D size={22}>{title}</D>{right ? <M>{right}</M> : null}</View>;
}
