import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, brand } from '../../src/theme';
import { M, D, tap } from '../../src/ui';

const LABELS: Record<string, string> = { home: 'LIVE', feed: 'FEED', explore: 'EXPLORE', profile: 'PROFILE' };
type BarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };
function Bar({ state, navigateToTab }: BarProps) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const routes = state.routes;
  const item = (i: number) => {
    const r = routes[i]!; const on = state.index === i;
    return <Pressable key={r.key} onPress={() => { tap(); navigateToTab(r.key); }} style={{ flex: 1, alignItems: 'center', paddingTop: 10, gap: 4 }}>
      <View style={{ width: 22, height: 3, backgroundColor: on ? brand.purple : 'transparent' }} />
      <M bold size={10} color={on ? c.text : c.sub}>{LABELS[r.name]}</M>
    </Pressable>;
  };
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderTopWidth: 1, borderColor: c.line, paddingBottom: Math.max(ins.bottom, 10), maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      {item(0)}{item(1)}
      <Pressable onPress={() => { tap('medium'); router.push('/callit'); }} style={{ flex: 1, alignItems: 'center', paddingTop: 6 }}>
        <View style={{ width: 46, height: 36, backgroundColor: brand.purple, alignItems: 'center', justifyContent: 'center' }}><D size={28} color="#fff">+</D></View>
      </Pressable>
      {item(2)}{item(3)}
    </View>
  );
}
export default function TabsLayout() {
  return <Tabs tabBar={(p) => <Bar state={p.state as unknown as BarProps['state']} navigateToTab={p.navigateToTab} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="home" /><Tabs.Screen name="feed" /><Tabs.Screen name="explore" /><Tabs.Screen name="profile" />
  </Tabs>;
}
