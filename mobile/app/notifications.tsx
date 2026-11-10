import React, { useEffect } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen, ErrorState } from '../src/Screen';
import { M, T, Skeleton } from '../src/ui';
import { useTheme, brand } from '../src/theme';
import { Api, ago, Note } from '../src/api';
import { useQ } from '../src/hooks';

function line(n: Note): [string, string, string] {
  const p = n.payload as { won?: boolean; outcome?: string; question?: string };
  switch (n.kind) {
    case 'resolved': return [p.won ? 'CALLED IT' : 'FULL TIME', `${p.question ?? 'A market'} settled ${p.outcome ?? ''}`, p.won ? brand.yes : brand.no];
    case 'follow': return ['NEW FAN', 'Someone followed you', brand.purple];
    case 'like': return ['LIKE', 'Someone liked your post', brand.no];
    case 'recast': return ['RECAST', 'Your post was recast', brand.purple];
    case 'tip': return ['TIP', 'You got a tip', brand.gold];
    default: return [n.kind.toUpperCase(), 'Update', brand.purple];
  }
}
export default function Notifications() {
  const { c } = useTheme();
  const q = useQ(() => Api.notes());
  useEffect(() => { Api.readNotes().catch(() => {}); }, []);
  return (
    <Screen title="Alerts" back>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : (
        <FlatList data={q.data?.items ?? []} keyExtractor={(n) => n.id}
          ListEmptyComponent={q.loading ? <View style={{ padding: 16, gap: 8 }}><Skeleton h={60} /><Skeleton h={60} /></View> : <M style={{ padding: 16 }}>All quiet.</M>}
          renderItem={({ item }) => { const [k, s, col] = line(item); const p = item.payload as { won?: boolean; question?: string };
            return <Pressable onPress={() => item.kind === 'resolved' && p.won && router.push(`/calledit?q=${encodeURIComponent(p.question ?? '')}&amt=250`)} style={{ flexDirection: 'row', gap: 12, padding: 16, borderBottomWidth: 1, borderColor: c.line, backgroundColor: item.read ? 'transparent' : c.card }}>
              <View style={{ width: 4, backgroundColor: col }} />
              <View style={{ flex: 1, gap: 2 }}><M bold color={col}>{k}</M><T size={14}>{s}</T></View><M>{ago(item.created_at)}</M>
            </Pressable>; }} />
      )}
    </Screen>
  );
}
