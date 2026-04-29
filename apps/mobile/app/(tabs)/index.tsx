import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { getOfflineRepertoriesList } from '@/lib/offline/sync';
import { CELEBRATION_ICONS, formatDate } from '@rl/utils';
import type { Repertory } from '@rl/types';
import { Plus, WifiOff, ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import * as Network from 'expo-network';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [isOffline, setIsOffline] = useState(false);

  const { data: repertories, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-repertories'],
    queryFn: async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOffline(!state.isConnected);

      if (!state.isConnected) {
        return getOfflineRepertoriesList();
      }

      const { data, error } = await supabase
        .from('repertories')
        .select('id, title, celebration, event_date, community, created_at')
        .eq('created_by', user?.id ?? '')
        .order('event_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Repertory[];
    },
    enabled: !!user,
  });

  const firstName = user?.full_name?.split(' ')[0] ?? 'usuário';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={repertories ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#1B3A6B']} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {/* Greeting */}
            <View style={styles.greetRow}>
              <View>
                <Text style={styles.greeting}>Olá, {firstName}! 🙏</Text>
                <Text style={styles.subGreeting}>
                  {isOffline ? 'Modo offline ativo' : 'Prontos para celebrar?'}
                </Text>
              </View>
              {isOffline && (
                <View style={styles.offlineBadge}>
                  <WifiOff size={12} color="#D97706" />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>

            {/* Quick actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/repertorios')}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionLabel}>Repertórios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/musicas')}
              >
                <Text style={styles.actionIcon}>🎵</Text>
                <Text style={styles.actionLabel}>Músicas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/musicas')}
              >
                <Text style={styles.actionIcon}>🔍</Text>
                <Text style={styles.actionLabel}>Buscar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Repertórios Recentes</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Nenhum repertório ainda</Text>
            {!isOffline && (
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/repertorios')}>
                <Plus size={16} color="#fff" />
                <Text style={styles.createBtnText}>Criar repertório</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/repertorio/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardIcon}>
                {CELEBRATION_ICONS[(item.celebration as any) ?? 'outro']}
              </Text>
              <View>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardSub}>
                  {item.event_date ? formatDate(item.event_date) : ''}
                  {item.community ? ` · ${item.community}` : ''}
                </Text>
              </View>
            </View>
            <ArrowRight size={18} color="#D1D5DB" />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { paddingBottom: 32 },
  header: { padding: 20, paddingTop: 8 },
  greetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subGreeting: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderColor: '#FDE68A', borderWidth: 1,
  },
  offlineText: { color: '#D97706', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 8,
    borderColor: '#E5E7EB', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10,
    borderRadius: 16, padding: 16,
    borderColor: '#F3F4F6', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', maxWidth: 200 },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1B3A6B', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
