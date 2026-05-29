'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Music, ChevronRight, Clock } from 'lucide-react';
import { timeAgo } from '@rl/utils';
import { loadRecentSongs, type RecentSongEntry } from '@/components/songs/SongDetail';

export function RecentlyViewedSongs() {
  const [songs, setSongs] = useState<RecentSongEntry[]>([]);

  useEffect(() => {
    setSongs(loadRecentSongs());
  }, []);

  if (songs.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="font-semibold text-gray-800 text-sm">Músicas Abertas</span>
        </div>
        <Link href="/musicas" className="btn-ghost p-1.5">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {songs.slice(0, 5).map(s => (
          <Link
            key={s.id}
            href={`/musicas/${s.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-brand-700 transition-colors truncate">
                {s.title}
              </p>
              <p className="text-xs text-gray-400">
                {s.author ? `${s.author} · ` : ''}{s.key_note ? `Tom ${s.key_note} · ` : ''}{timeAgo(s.viewed_at)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
