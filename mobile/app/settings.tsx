import React from 'react';
import { View, Pressable, ScrollView, GestureResponderEvent } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '../src/Screen';
import { D, M, T, Btn, tap } from '../src/ui';
import { useTheme, brand } from '../src/theme';
import { useSession } from '../src/session';
import { API_URL } from '../src/api';

const MODES = [['system', 'System', '◐'], ['dark', 'Night game', '☾'], ['light', 'Matchday', '☀']] as const;
export default function Settings() {
  const { c, pref, setPref } = useTheme();
  const { user, signOut } = useSession();
  return (
    <Screen title="Settings" back>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <D size={22}>Appearance</D>
        <T size={14} color={c.sub}>System follows your device. Night game is the black broadcast; Matchday is the bright daytime look.</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MODES.map(([k, l, i]) => (
            <Pressable key={k} onPress={(e: GestureResponderEvent) => { tap('medium'); setPref(k, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }); }} style={{ flex: 1, height: 88, padding: 10, justifyContent: 'space-between', backgroundColor: pref === k ? brand.purple : c.card }}>
              <T size={18} color={pref === k ? '#fff' : c.text}>{i}</T><D size={19} color={pref === k ? '#fff' : c.text}>{l}</D>
              {pref === k && <View style={{ position: 'absolute', right: 8, top: 8, width: 8, height: 8, backgroundColor: '#fff' }} />}
            </Pressable>
          ))}
        </View>
        <D size={22} style={{ marginTop: 18 }}>Account</D>
        <View style={{ backgroundColor: c.card, padding: 12, gap: 4 }}><T bold>{user?.display_name ?? 'Signed out'}</T><M>@{user?.handle} · {user?.near_account ?? 'NEAR testnet'}</M></View>
        <D size={22} style={{ marginTop: 18 }}>About</D>
        <M>CALLED {Constants.expoConfig?.version} · API {API_URL}</M>
        <M>Test USDC on NEAR testnet. No political markets.</M>
        <Btn style={{ marginTop: 24 }} label="Sign out" bg={brand.no} color="#000" onPress={async () => { await signOut(); router.replace('/signin'); }} />
      </ScrollView>
    </Screen>
  );
}
