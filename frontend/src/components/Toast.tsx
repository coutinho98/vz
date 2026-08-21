import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const ToastContext = createContext<{
  toast: (t: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro do ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'success' }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = ++nextId.current;
      setItems((list) => [...list, { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex animate-in fade-in slide-in-from-bottom-2 items-start gap-2.5 border-2 border-black p-3 shadow-md duration-200',
              t.variant === 'error'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-card',
            )}
          >
            {t.variant === 'error' ? (
              <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs opacity-80">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => dismiss(t.id)}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center border border-current/40 transition hover:bg-foreground/10"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
