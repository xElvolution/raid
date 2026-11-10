import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { BigShouldersDisplay_900Black } from '@expo-google-fonts/big-shoulders-display';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme';
import { MaybePrivy } from '../src/privy';
import { SessionProvider, useSession } from '../src/session';

SplashScreen.preventAutoHideAsync().catch(() => {});

class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error('[called] crash', err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24, gap: 14 }}>
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>OFF AIR</Text>
        <Text style={{ color: '#9A9AA8' }}>{this.state.err.message}</Text>
        <Pressable onPress={() => this.setState({ err: null })} style={{ backgroundColor: '#7C5CFF', padding: 14 }}><Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>BACK ON AIR</Text></Pressable>
      </View>
    );
  }
}
export { Boundary as ErrorBoundary };

function Nav() {
  const { c } = useTheme();
  const { ready } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: c.bg } }}>
    <Stack.Screen name="callit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="calledit" options={{ presentation: 'transparentModal', animation: 'fade' }} />
  </Stack>;
}

export default function Root() {
  const [ok] = useFonts({ BigShouldersDisplay_900Black, JetBrainsMono_500Medium, JetBrainsMono_700Bold, Inter_400Regular, Inter_600SemiBold });
  React.useEffect(() => { if (ok) SplashScreen.hideAsync().catch(() => {}); }, [ok]);
  if (!ok) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MaybePrivy><ThemeProvider><SessionProvider><Boundary><Nav /></Boundary></SessionProvider></ThemeProvider></MaybePrivy>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
