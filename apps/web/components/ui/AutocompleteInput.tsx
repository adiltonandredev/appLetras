'use client';

import { useRef, useState, useEffect } from 'react';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export interface Suggestion {
  value: string;
  sublabel?: string;
  href?: string;      // se definido, mostra como aviso de duplicata
  isDuplicate?: boolean;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  suggestions: Suggestion[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  loading = false,
  placeholder,
  className,
  inputProps,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          {...inputProps}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={clsx('input w-full', className)}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden max-h-56 overflow-y-auto">
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
            </div>
          )}
          {suggestions.map((s, i) => (
            <div key={i}>
              {s.isDuplicate ? (
                /* Aviso de duplicata — não seleciona, só linka */
                <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-l-4 border-amber-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-800 truncate">{s.value}</p>
                      {s.sublabel && (
                        <p className="text-xs text-amber-600 truncate">{s.sublabel}</p>
                      )}
                    </div>
                  </div>
                  {s.href && (
                    <Link
                      href={s.href}
                      target="_blank"
                      className="shrink-0 text-xs text-amber-700 font-semibold hover:underline flex items-center gap-1 ml-2"
                      onClick={e => e.stopPropagation()}
                    >
                      Ver <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ) : (
                /* Sugestão normal — clica para preencher */
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    onChange(s.value);
                    onSelect?.(s.value);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-brand-50 transition-colors"
                >
                  <p className="text-sm text-gray-800 font-medium truncate">{s.value}</p>
                  {s.sublabel && (
                    <p className="text-xs text-gray-400 truncate">{s.sublabel}</p>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
