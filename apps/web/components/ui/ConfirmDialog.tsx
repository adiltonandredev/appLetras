'use client';

import { useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  icon?: 'trash' | 'logout' | 'alert';
}

interface DialogState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────
export function useConfirm() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialog?.resolve(true);
    setDialog(null);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.resolve(false);
    setDialog(null);
  }, [dialog]);

  const ConfirmDialogNode: ReactNode = dialog ? (
    <ConfirmDialogUI
      options={dialog.options}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialogNode };
}

// ─── Componente visual ────────────────────────────────────────
function ConfirmDialogUI({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const {
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    icon = 'alert',
  } = options;

  const isDanger = variant === 'danger';

  const IconComponent =
    icon === 'trash' ? Trash2 :
    icon === 'logout' ? LogOut :
    AlertTriangle;

  const iconBg  = isDanger ? 'bg-red-100'    : 'bg-amber-100';
  const iconClr = isDanger ? 'text-red-600'  : 'text-amber-600';
  const btnClr  = isDanger
    ? 'bg-red-600 hover:bg-red-500 focus-visible:ring-red-500'
    : 'bg-amber-500 hover:bg-amber-400 focus-visible:ring-amber-400';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      {/* Backdrop click cancela */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">

        {/* Botão fechar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ícone */}
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
          <IconComponent className={`w-6 h-6 ${iconClr}`} />
        </div>

        {/* Texto */}
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>

        {/* Ações */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${btnClr}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
