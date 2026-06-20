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

function SongCard({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.author && (
            <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text>
          )}
          {item.categories?.length > 0 && (
            <View style={styles.tags}>
              {item.categories.slice(0, 2).map((cat: any) => (
                <View key={cat.id} style={styles.tag}>
                  <Text style={styles.tagText}>{cat.name}</Text>
                </View>
              ))}
              {item.categories.length > 2 && (
                <Text style={styles.tagMore}>+{item.categories.length - 2}</Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.cardRight}>
          {item.key_note && (
            <View style={styles.keyBadge}>
              <Text style={styles.keyText}>{item.key_note}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginTop: 8 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MusicasScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('liturgical_categories')
        .select('*')
        .order('sort_order');
      return data ?? [];
    },
  });

  const { data: songs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['songs', 'mobile', search, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('songs')
        .select(`
          id, title, author, key_note, status,
          categories:song_categories(category:liturgical_categories(id, name, slug))
        `)
        .eq('status', 'approved')
        .order('title')
        .limit(100);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data ?? []).map((s: any) => ({
        ...s,
        categories: s.categories?.map((sc: any) => sc.category) ?? [],
      }));

      if (selectedCategory) {
        return mapped.filter((s: any) =>
          s.categories.some((c: any) => c.id === selectedCategory)
        );
      }

      return mapped;
    },
  });

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por título ou autor..."
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

      {/* Category filter */}
      {categories && categories.length > 0 && (
        <FlatList
          horizontal
          data={[{ id: null, name: 'Todas' }, ...categories]}
          keyExtractor={(item: any) => item.id ?? 'all'}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item.id)}
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive,
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === item.id && styles.categoryChipTextActive,
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1e3a5f" />
        </View>
      ) : !songs || songs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyTitle}>Nenhuma música encontrada</Text>
          <Text style={styles.emptySubtitle}>Tente outro termo de busca.</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <SongCard
              item={item}
              onPress={() => router.push(`/musica/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1e3a5f" />
          }
          ListFooterComponent={() => (
            <Text style={styles.count}>{songs.length} músicas</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  categoryList: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  categoryChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1e3a5f',
  },
  categoryChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  categoryChipTextActive: { color: '#1e3a5f', fontWeight: '600' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardAuthor: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  tagText: { fontSize: 10, color: '#4338CA', fontWeight: '500' },
  tagMore: { fontSize: 10, color: '#9CA3AF', alignSelf: 'center' },
  keyBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  keyText: { fontSize: 12, fontWeight: '700', color: '#1e3a5f', fontFamily: 'monospace' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  count: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', padding: 16 },
});
