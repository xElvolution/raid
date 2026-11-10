import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, Dimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';

export const brand = { purple: '#7C5CFF', yes: '#1FD17A', no: '#FF4B5C', gold: '#FFE27A' };
const dark = { bg: '#000000', card: '#0E0E12', card2: '#16161C', line: '#24242C', text: '#FFFFFF', sub: '#9A9AA8', invert: '#000' };
const light = { bg: '#F3F2EE', card: '#FFFFFF', card2: '#E8E6E0', line: '#D9D6CE', text: '#0A0A0B', sub: '#66666F', invert: '#fff' };
export type Palette = typeof dark & typeof brand & { mode: 'dark' | 'light' };
export const F = { display: 'BigShouldersDisplay_900Black', mono: 'JetBrainsMono_500Medium', monoB: 'JetBrainsMono_700Bold', body: 'Inter_400Regular', bodyB: 'Inter_600SemiBold' };

type Pref = 'system' | 'dark' | 'light';
const Ctx = createContext<{ c: Palette; pref: Pref; setPref: (p: Pref, at?: { x: number; y: number }) => void; toggle: () => void }>(null as never);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [pref, setPrefState] = useState<Pref>('system');
  useEffect(() => { AsyncStorage.getItem('theme').then((v) => v && setPrefState(v as Pref)); }, []);
  const mode = pref === 'system' ? (sys === 'light' ? 'light' : 'dark') : pref;
  const c: Palette = { ...(mode === 'dark' ? dark : light), ...brand, mode };
  const { width, height } = Dimensions.get('window');
  // Circular reveal (matches web): a disc in the incoming theme's colour grows from the tap point, theme swaps, disc fades.
  const r = useSharedValue(0), o = useSharedValue(0);
  const [disc, setDisc] = useState({ x: width / 2, y: 60, color: brand.purple });
  const apply = useCallback((p: Pref) => { setPrefState(p); AsyncStorage.setItem('theme', p); }, []);
  const setPref = useCallback((p: Pref, at?: { x: number; y: number }) => {
    const next = p === 'system' ? (sys === 'light' ? 'light' : 'dark') : p;
    setDisc({ x: at?.x ?? width / 2, y: at?.y ?? 60, color: next === 'dark' ? dark.bg : light.bg });
    r.value = 0; o.value = 1;
    r.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (f) => {
      if (!f) return;
      runOnJS(apply)(p);
      o.value = withTiming(0, { duration: 220 });
    });
  }, [apply, r, o, sys, width]);
  const toggle = useCallback(() => setPref(mode === 'dark' ? 'light' : 'dark'), [mode, setPref]);
  const R = Math.hypot(width, height);
  const wipe = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(r.value, 0.001) }], opacity: o.value }));
  return (
    <Ctx.Provider value={{ c, pref, setPref, toggle }}>
      {children}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: disc.x - R, top: disc.y - R, width: R * 2, height: R * 2, borderRadius: R, backgroundColor: disc.color, borderWidth: 6, borderColor: brand.purple }, wipe]} />
    </Ctx.Provider>
  );
}
