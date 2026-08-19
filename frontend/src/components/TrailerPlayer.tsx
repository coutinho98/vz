import { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailerPlayerProps {
  youtubeKey: string | null | undefined;
  title?: string;
}

// trailer como convidado: chip discreto na página, player em modal por cima
export function TrailerPlayer({ youtubeKey, title }: TrailerPlayerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!youtubeKey) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 border-2 border-black bg-card px-2.5 py-1.5 font-head text-xs font-bold uppercase tracking-wider shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow"
      >
        <Play className="size-3.5 fill-current" aria-hidden />
        Trailer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title ? `Trailer de ${title}` : 'Trailer'}
          onClick={() => setOpen(false)}
        >
          <div
            className={cn(
              'w-full max-w-3xl overflow-hidden border-2 border-black bg-card shadow-2xl',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-accent px-3 py-2">
              <span className="truncate font-head text-xs font-bold uppercase tracking-wider">
                {title ?? 'Trailer'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar trailer"
                className="flex size-6 items-center justify-center border-2 border-black bg-card transition hover:bg-primary"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
                title={title || 'Trailer'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
