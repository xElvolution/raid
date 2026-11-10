import React, { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import { Screen, ErrorState } from '../../src/Screen';
import { D, M, Skeleton, tap } from '../../src/ui';
import { PostCard } from '../../src/cards';
import { useTheme, brand } from '../../src/theme';
import { Api } from '../../src/api';
import { useQ } from '../../src/hooks';

export default function Feed() {
  const { c } = useTheme();
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const q = useQ(() => Api.feed(tab), [tab]);
  return (
    <Screen wipe={false}>
      <View style={{ paddingHorizontal: 16, height: 52, justifyContent: 'center' }}><D size={34}>Feed</D></View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line }}>
        {(['foryou', 'following'] as const).map((t) => (
          <Pressable key={t} onPress={() => { tap(); setTab(t); }} style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 3, borderColor: tab === t ? brand.purple : 'transparent' }}>
            <M bold color={tab === t ? c.text : c.sub}>{t === 'foryou' ? 'FOR YOU' : 'FOLLOWING'}</M>
          </Pressable>
        ))}
      </View>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : (
        <FlatList data={q.data?.items ?? []} keyExtractor={(p) => p.id} renderItem={({ item, index }) => <PostCard p={item} i={Math.min(index, 6)} />}
          refreshControl={<RefreshControl refreshing={q.loading && !!q.data} onRefresh={q.reload} tintColor={brand.purple} />}
          ListEmptyComponent={q.loading ? <View style={{ padding: 16, gap: 12 }}><Skeleton h={180} /><Skeleton h={180} /></View> : <M style={{ padding: 16 }}>Nothing on air yet.</M>} />
      )}
    </Screen>
  );
}
