import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  StatusBar, ScrollView, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getOfflineRepertory } from '@/lib/offline/db';
import { X, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react-native';
import * as Network from 'expo-network';
import type { Repertory, RepertoryItem } from '@rl/types';

const { width: SCREEN_W } = Dimensions.get('window');
const FONT_SIZES = [14, 16, 18, 20, 24];

export default function ApresentacaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSizeIdx, setFontSizeIdx] = useState(2); // 18px default
  const fontSize = FONT_SIZES[fontSizeIdx];

  const { data: repertory } = useQuery({
    queryKey: ['apresentacao', id],
    queryFn: async () => {
      const state = await Network.getNetworkStateAsync();

      if (!state.isConnected) {
        return getOfflineRepertory(id) as Repertory | null;
      }

      const { data, error } = await supabase
        .from('repertories')
        .select(`
          id, title,
          items:repertory_items(
            id, position, custom_key, observations,
            song:songs(id, title, lyrics, key_note, author)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        items: (data.items ?? []).sort((a: any, b: any) => a.position - b.position),
      } as Repertory;
    },
  });

  const items: RepertoryItem[] = (repertory?.items ?? []) as RepertoryItem[];
  const current = items[currentIndex];
  const song = (current as any)?.song;
  const total = items.length;

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, total]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  // Swipe gesture
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) goNext();
      else if (g.dx > 50) goPrev();
    },
  });

  const bg = darkMode ? '#0D1117' : '#FFFFFF';
  const textColor = darkMode ? '#E6EDF3' : '#1A1A2E';
  const mutedColor = darkMode ? '#8B949E' : '#6B7280';
  const navBg = darkMode ? '#161B22' : '#F9FAFB';

  if (!repertory) {
    return (
      <View style={[styles.loading, { backgroundColor: bg }]}>
        <Text style={{ color: textColor }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* Top controls */}
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <X size={20} color={mutedColor} />
          </TouchableOpacity>

          <View style={styles.progressDots}>
            {items.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)}>
                <View style={[
                  styles.dot,
                  i === currentIndex && { backgroundColor: '#2D7DD2', width: 20 },
                  { backgroundColor: i === currentIndex ? '#2D7DD2' : mutedColor },
                ]} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.topActions}>
            {/* Font size */}
            <TouchableOpacity
              onPress={() => setFontSizeIdx(i => Math.min(i + 1, FONT_SIZES.length - 1))}
              style={styles.iconBtn}
            >
              <Text style={{ color: mutedColor, fontSize: 14, fontWeight: '700' }}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFontSizeIdx(i => Math.max(i - 1, 0))}
              style={styles.iconBtn}
            >
              <Text style={{ color: mutedColor, fontSize: 12, fontWeight: '700' }}>A-</Text>
            </TouchableOpacity>
            {/* Dark mode */}
            <TouchableOpacity onPress={() => setDarkMode(d => !d)} style={styles.iconBtn}>
              {darkMode
                ? <Sun size={18} color={mutedColor} />
                : <Moon size={18} color={mutedColor} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Song content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Song meta */}
        <Text style={[styles.categoryBadge, { color: '#2D7DD2' }]}>
          {`${currentIndex + 1} de ${total}`}
        </Text>

        <Text style={[styles.songTitle, { color: textColor, fontSize: fontSize + 8 }]}>
          {song?.title ?? '—'}
        </Text>

        {(current as any)?.custom_key || song?.key_note ? (
          <Text style={[styles.keyBadge, { color: mutedColor }]}>
            Tom: {(current as any)?.custom_key ?? song?.key_note}
          </Text>
        ) : null}

        {song?.author ? (
          <Text style={[styles.author, { color: mutedColor, fontSize: fontSize - 2 }]}>
            {song.author}
          </Text>
        ) : null}

        <View style={styles.divider} />

        {/* Lyrics */}
        <Text style={[styles.lyrics, { color: textColor, fontSize, lineHeight: fontSize * 1.7 }]}>
          {song?.lyrics ?? ''}
        </Text>

        {/* Observations */}
        {(current as any)?.observations ? (
          <View style={[styles.obsBox, { borderColor: mutedColor + '30' }]}>
            <Text style={[styles.obsText, { color: mutedColor, fontSize: fontSize - 2 }]}>
              ℹ️ {(current as any).observations}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom navigation */}
      <SafeAreaView edges={['bottom']} style={[styles.navBar, { backgroundColor: navBg }]}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={currentIndex === 0}
          style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
        >
          <ChevronLeft size={22} color={textColor} />
          <Text style={[styles.navLabel, { color: textColor }]}>Anterior</Text>
        </TouchableOpacity>

        <Text style={[styles.navCounter, { color: mutedColor }]}>
          {currentIndex + 1} / {total}
        </Text>

        <TouchableOpacity
          onPress={goNext}
          disabled={currentIndex >= total - 1}
          style={[styles.navBtn, currentIndex >= total - 1 && { opacity: 0.3 }]}
        >
          <Text style={[styles.navLabel, { color: textColor }]}>Próxima</Text>
          <ChevronRight size={22} color={textColor} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, width: 6, borderRadius: 3 },
  topActions: { flexDirection: 'row', gap: 4 },
  content: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  categoryBadge: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  songTitle: { fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  keyBadge: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  author: { marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#8B949E30', marginVertical: 20 },
  lyrics: { fontFamily: 'System', letterSpacing: 0.1 },
  obsBox: { marginTop: 24, borderWidth: 1, borderRadius: 12, padding: 14 },
  obsText: { lineHeight: 22 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#30363D40',
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navCounter: { fontSize: 14, fontWeight: '500' },
});
