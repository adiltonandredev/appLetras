import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '@/lib/supabase/provider';
import { getAllOfflineRepertories } from '@/lib/db';
import { CELEBRATION_ICONS, CELEBRATION_LABELS, formatDate } from '@rl/utils';

function RepertoryCard({ item, onPress }: { item: any; onPress: () => void }) {
  // campo correto é 'celebration', não 'celebration_type'
  const icon = CELEBRATION_ICONS[item.celebration] ?? '🎵';
  const label = CELEBRATION_LABELS[item.celebration] ?? item.celebration ?? '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>

      <View style={styles.cardFooter}>
        {/* campo correto é 'event_date', não 'date' */}
        {item.event_date && (
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={12} color="#6B7280" />
            <Text style={styles.metaChipText}>{formatDate(item.event_date)}</Text>
          </View>
        )}
        {item.community && (
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={styles.metaChipText} numberOfLines={1}>{item.community}</Text>
          </View>
        )}
        <View style={[styles.metaChip, { marginLeft: 'auto' }]}>
          <Ionicons name="musical-notes-outline" size={12} color="#6B7280" />
          <Text style={styles.metaChipText}>
            {item.items?.length ?? 0} músicas
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RepertoriosScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'online' | 'offline'>('online');

  const { data: onlineRepertories, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['repertories', 'mobile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repertories')
        .select('id, title, celebration, event_date, community, created_at, items:repertory_items(id)')
        .order('event_date', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: tab === 'online',
  });

  const { data: offlineRepertories, isLoading: offlineLoading } = useQuery({
    queryKey: ['repertories', 'offline'],
    queryFn: getAllOfflineRepertories,
    enabled: tab === 'offline',
  });

  const repertories = tab === 'online' ? (onlineRepertories ?? []) : (offlineRepertories ?? []);
  const loading = tab === 'online' ? isLoading : offlineLoading;

  const filtered = repertories.filter((r: any) =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.community?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Tabs online/offline */}
      <View style={styles.tabs}>
        {(['online', 'offline'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Ionicons
              name={t === 'online' ? 'cloud-outline' : 'download-outline'}
              size={14}
              color={tab === t ? '#1e3a5f' : '#6B7280'}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'online' ? 'Online' : 'Salvos offline'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar repertório..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1e3a5f" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{tab === 'offline' ? '📥' : '📋'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'offline' ? 'Nenhum repertório salvo offline' : 'Nenhum repertório encontrado'}
          </Text>
          {tab === 'offline' && (
            <Text style={styles.emptySubtitle}>
              Abra um repertório online e toque em "Salvar offline" para acessá-lo sem internet.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <RepertoryCard
              item={item}
              onPress={() => router.push(`/repertorio/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            tab === 'online' ? (
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1e3a5f" />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#1e3a5f', fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 28 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  metaChipText: { fontSize: 11, color: '#6B7280' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
