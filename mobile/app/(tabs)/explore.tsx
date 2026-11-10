import React, { useState } from 'react';
import { View, FlatList, Pressable, TextInput, ScrollView } from 'react-native';
import { Screen, ErrorState } from '../../src/Screen';
import { D, M, Skeleton, tap } from '../../src/ui';
import { MarketCard } from '../../src/cards';
import { useTheme, brand, F } from '../../src/theme';
import { Api } from '../../src/api';
import { useQ } from '../../src/hooks';

const CATS = ['all', 'sports', 'crypto', 'tech', 'music', 'culture'] as const;
export default function Explore() {
  const { c } = useTheme();
  const [cat, setCat] = useState<(typeof CATS)[number]>('all');
  const [s, setS] = useState('');
  const q = useQ(() => (s.length > 1 ? Api.search(s).then((r) => ({ items: r.markets })) : Api.markets(`sort=volume${cat === 'all' ? '' : `&category=${cat}`}`)), [cat, s]);
  return (
    <Screen wipe={false}>
      <View style={{ paddingHorizontal: 16, height: 52, justifyContent: 'center' }}><D size={34}>Explore</D></View>
      <TextInput value={s} onChangeText={setS} placeholder="SEARCH MARKETS" placeholderTextColor={c.sub} style={{ marginHorizontal: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontFamily: F.mono, padding: 12 }} />
      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {CATS.map((k) => <Pressable key={k} onPress={() => { tap(); setCat(k); }} style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: cat === k ? brand.purple : c.card2 }}><M bold color={cat === k ? '#fff' : c.text}>{k.toUpperCase()}</M></Pressable>)}
      </ScrollView></View>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : (
        <FlatList data={(q.data?.items ?? []).filter((m) => m.status !== 'final')} keyExtractor={(m) => m.id} renderItem={({ item, index }) => <MarketCard m={item} i={Math.min(index, 5)} />}
          ListEmptyComponent={q.loading ? <View style={{ paddingHorizontal: 16, gap: 12 }}><Skeleton h={240} /><Skeleton h={240} /></View> : <M style={{ padding: 16 }}>No markets match.</M>} />
      )}
    </Screen>
  );
}
