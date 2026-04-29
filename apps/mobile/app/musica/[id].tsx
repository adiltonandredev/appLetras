import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '@/lib/supabase/provider';

const FONT_SIZES = [13, 15, 17, 19, 22] as const;

export default function MusicaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { supabase } = useSupabase();

  const [tab, setTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [fontIdx, setFontIdx] = useState(1);

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          *,
          categories:song_categories(category:liturgical_categories(id, name))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        categories: data?.categories?.map((sc: any) => sc.category) ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1e3a5f" size="large" />
      </View>
    );
  }

  if (!song) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Música não encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasChords = Boolean(song.chords);
  const fontSize = FONT_SIZES[fontIdx];

  return (
    <>
      <Stack.Screen
        options={{
          title: song.title,
          headerBackTitle: 'Músicas',
        }}
      />
      <View style={styles.container}>
        {/* Header info */}
        <View style={styles.infoBar}>
          <View style={styles.infoLeft}>
            {song.author && (
              <Text style={styles.authorText}>{song.author}</Text>
            )}
            {song.categories?.length > 0 && (
              <View style={styles.catRow}>
                {song.categories.slice(0, 3).map((cat: any) => (
                  <View key={cat.id} style={styles.catBadge}>
                    <Text style={styles.catText}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.infoRight}>
            {song.key_note && (
              <View style={styles.keyBadge}>
                <Text style={styles.keyLabel}>Tom</Text>
                <Text style={styles.keyValue}>{song.key_note}</Text>
              </View>
            )}
            {song.bpm && (
              <View style={styles.bpmBadge}>
                <Text style={styles.bpmLabel}>BPM</Text>
                <Text style={styles.bpmValue}>{song.bpm}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setTab('lyrics')}
            style={[styles.tab, tab === 'lyrics' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'lyrics' && styles.tabTextActive]}>
              🎵 Letra
            </Text>
          </TouchableOpacity>
          {hasChords && (
            <TouchableOpacity
              onPress={() => setTab('chords')}
              style={[styles.tab, tab === 'chords' && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === 'chords' && styles.tabTextActive]}>
                🎸 Cifra
              </Text>
            </TouchableOpacity>
          )}

          {/* Font size */}
          <View style={styles.fontControls}>
            <TouchableOpacity
              onPress={() => setFontIdx(i => Math.max(0, i - 1))}
              style={styles.fontBtn}
              disabled={fontIdx === 0}
            >
              <Text style={[styles.fontBtnText, fontIdx === 0 && styles.fontBtnDisabled]}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFontIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
              style={styles.fontBtn}
              disabled={fontIdx === FONT_SIZES.length - 1}
            >
              <Text style={[styles.fontBtnText, fontIdx === FONT_SIZES.length - 1 && styles.fontBtnDisabled]}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {tab === 'lyrics' ? (
            song.lyrics ? (
              <Text style={[styles.lyricsText, { fontSize, lineHeight: fontSize * 1.65 }]}>
                {song.lyrics}
              </Text>
            ) : (
              <Text style={styles.emptyText}>Letra não cadastrada.</Text>
            )
          ) : (
            song.chords ? (
              <Text style={[styles.chordsText, { fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.7 }]}>
                {song.chords}
              </Text>
            ) : (
              <Text style={styles.emptyText}>Cifra não cadastrada.</Text>
            )
          )}

          {song.observations && (
            <View style={styles.obsBox}>
              <Text style={styles.obsTitle}>Observações</Text>
              <Text style={styles.obsText}>{song.observations}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#374151', marginBottom: 12 },
  backBtn: { backgroundColor: '#1e3a5f', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  infoLeft: { flex: 1 },
  authorText: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  catBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  catText: { fontSize: 10, color: '#4338CA', fontWeight: '500' },
  infoRight: { flexDirection: 'row', gap: 8 },
  keyBadge: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  keyLabel: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  keyValue: { fontSize: 14, fontWeight: '700', color: '#1e3a5f', fontFamily: 'monospace' },
  bpmBadge: { alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  bpmLabel: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  bpmValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: { borderBottomColor: '#1e3a5f' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#1e3a5f', fontWeight: '600' },
  fontControls: { flexDirection: 'row', gap: 4, marginLeft: 'auto', paddingBottom: 4 },
  fontBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  fontBtnText: { fontSize: 13, fontWeight: '600', color: '#1e3a5f' },
  fontBtnDisabled: { color: '#D1D5DB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 40 },
  lyricsText: { color: '#1F2937', lineHeight: 26 },
  chordsText: { color: '#1F2937', lineHeight: 26, fontFamily: 'monospace' },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  obsBox: {
    marginTop: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#1e3a5f',
  },
  obsTitle: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  obsText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
});
