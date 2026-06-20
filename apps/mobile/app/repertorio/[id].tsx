import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '@/lib/supabase/provider';
import { saveRepertoryOffline, getOfflineRepertory } from '@/lib/db';
import { CELEBRATION_LABELS, CELEBRATION_ICONS, formatDate } from '@rl/utils';

export default function RepertorioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { supabase } = useSupabase();
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  const { data: repertory, isLoading, error } = useQuery({
    queryKey: ['repertory', id],
    queryFn: async () => {
      // Try online first
      const { data, error } = await supabase
        .from('repertories')
        .select(`
          *,
          creator:users!created_by(full_name),
          items:repertory_items(
            id, position, custom_key, observations,
            song:songs(id, title, author, key_note, bpm, lyrics, chords,
              categories:song_categories(category:liturgical_categories(id, name)))
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        // Fallback to offline
        const offline = await getOfflineRepertory(id);
        if (offline) return offline;
        throw error;
      }

      return {
        ...data,
        items: (data.items ?? [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((item: any) => ({
            ...item,
            song: item.song ? {
              ...item.song,
              categories: item.song.categories?.map((sc: any) => sc.category) ?? [],
            } : null,
          })),
      };
    },
  });

  async function handleSaveOffline() {
    if (!repertory) return;
    setSaving(true);
    try {
      // saveRepertoryOffline exige (id, data) — bug corrigido
      saveRepertoryOffline((repertory as any).id, repertory as any);
      setSavedOffline(true);
      Alert.alert('✅ Salvo offline', 'Este repertório está disponível sem internet.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar offline.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1e3a5f" size="large" />
      </View>
    );
  }

  if (!repertory) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Repertório não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // campo correto é 'celebration', não 'celebration_type'
  const icon = CELEBRATION_ICONS[(repertory as any).celebration] ?? '🎵';
  const celebrationLabel = CELEBRATION_LABELS[(repertory as any).celebration] ?? (repertory as any).celebration ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: repertory.title,
          headerBackTitle: 'Repertórios',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSaveOffline}
              disabled={saving || savedOffline}
              style={{ marginRight: 4 }}
            >
              <Ionicons
                name={savedOffline ? 'checkmark-circle' : 'download-outline'}
                size={22}
                color={savedOffline ? '#10B981' : '#1e3a5f'}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>{icon}</Text>
          <Text style={styles.title}>{repertory.title}</Text>
          <Text style={styles.celebrationType}>{celebrationLabel}</Text>

          <View style={styles.metaRow}>
            {/* campo correto é 'event_date', não 'date' */}
            {(repertory as any).event_date && (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                <Text style={styles.metaChipText}>{formatDate((repertory as any).event_date)}</Text>
              </View>
            )}
            {repertory.community && (
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={13} color="#6B7280" />
                <Text style={styles.metaChipText}>{repertory.community}</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="musical-notes-outline" size={13} color="#6B7280" />
              <Text style={styles.metaChipText}>
                {(repertory as any).items?.length ?? 0} músicas
              </Text>
            </View>
          </View>

          {(repertory as any).observations && (
            <Text style={styles.notes}>{(repertory as any).observations}</Text>
          )}
        </View>

        {/* Presentation button */}
        <TouchableOpacity
          style={styles.presentationBtn}
          onPress={() => router.push(`/apresentacao/${id}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={styles.presentationBtnText}>Iniciar Apresentação</Text>
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Song list */}
        <Text style={styles.sectionTitle}>Músicas</Text>

        {(repertory as any).items?.map((item: any, idx: number) => {
          const song = item.song;
          if (!song) return null;
          const displayKey = item.custom_key ?? song.key_note;
          const isExpanded = expandedSong === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.songCard}
              onPress={() => setExpandedSong(isExpanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.songHeader}>
                <View style={styles.songNum}>
                  <Text style={styles.songNumText}>{idx + 1}</Text>
                </View>
                <View style={styles.songMeta}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  {song.author && (
                    <Text style={styles.songAuthor}>{song.author}</Text>
                  )}
                </View>
                {displayKey && (
                  <View style={styles.keyBadge}>
                    <Text style={styles.keyText}>{displayKey}</Text>
                  </View>
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#9CA3AF"
                />
              </View>

              {item.observations && (
                <Text style={styles.songObs}>{item.observations}</Text>
              )}

              {isExpanded && (
                <View style={styles.lyricsContainer}>
                  {song.chords ? (
                    <Text style={styles.chordsText}>{song.chords}</Text>
                  ) : song.lyrics ? (
                    <Text style={styles.lyricsText}>{song.lyrics}</Text>
                  ) : (
                    <Text style={styles.noLyrics}>Letra não cadastrada.</Text>
                  )}
                  <TouchableOpacity
                    style={styles.songDetailBtn}
                    onPress={() => router.push(`/musica/${song.id}`)}
                  >
                    <Text style={styles.songDetailBtnText}>Ver detalhes completos →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Save offline hint */}
        {!savedOffline && (
          <TouchableOpacity
            style={styles.offlineCard}
            onPress={handleSaveOffline}
            disabled={saving}
          >
            <Ionicons name="cloud-download-outline" size={20} color="#1e3a5f" />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>Salvar para uso offline</Text>
              <Text style={styles.offlineSubtitle}>Acesse este repertório sem internet</Text>
            </View>
            {saving ? (
              <ActivityIndicator size="small" color="#1e3a5f" />
            ) : (
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#374151', marginBottom: 12 },
  backBtn: { backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerIcon: { fontSize: 42, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  celebrationType: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  metaChipText: { fontSize: 12, color: '#6B7280' },
  notes: { marginTop: 12, fontSize: 13, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' },
  presentationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  presentationBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  songCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  songHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  songNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  songMeta: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  songAuthor: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  keyBadge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  keyText: { fontSize: 11, fontWeight: '700', color: '#1e3a5f', fontFamily: 'monospace' },
  songObs: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 8,
  },
  lyricsContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  lyricsText: { fontSize: 13, color: '#374151', lineHeight: 22 },
  chordsText: { fontSize: 12, color: '#374151', lineHeight: 22, fontFamily: 'monospace' },
  noLyrics: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  songDetailBtn: { marginTop: 10, alignSelf: 'flex-end' },
  songDetailBtnText: { fontSize: 12, color: '#1e3a5f', fontWeight: '600' },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: 4,
  },
  offlineTitle: { fontSize: 13, fontWeight: '600', color: '#1e3a5f' },
  offlineSubtitle: { fontSize: 11, color: '#6B7280', marginTop: 1 },
});
