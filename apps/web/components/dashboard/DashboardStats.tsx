'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function DashboardStats({ stats }: { stats: Stat[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {stats.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className={`text-base font-black ${s.color}`}>{s.value}</span>
              <span className="text-xs text-gray-400 hidden sm:inline">{s.label}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <span>Estatísticas</span>
          <ChevronDown className={clsx('w-4 h-4 transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {/* Expandido */}
      {open && (
        <div className="border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-4 px-5 py-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
