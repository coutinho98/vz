import { Badge as KitBadge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const PLACEHOLDER_BG = ['bg-primary', 'bg-accent', 'bg-muted', 'bg-[#c5d5ff]'];

function posterSeed(alt: string) {
  let hash = 0;
  for (const ch of alt) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

export function Poster({
  src,
  alt,
  className = '',
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  const initial = alt.trim().charAt(0).toUpperCase() || '?';
  const bg = PLACEHOLDER_BG[posterSeed(alt) % PLACEHOLDER_BG.length];
  return (
    <div
      className={cn(
        'flex aspect-[2/3] w-full items-center justify-center border-2 border-black',
        bg,
        className,
      )}
    >
      <span className="font-head text-5xl">{initial}</span>
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      <p className="font-mono text-xs uppercase tracking-widest">{label}</p>
    </div>
  );
}

export type BadgeTone =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  // tons semânticos remapeados para o kit
  | 'success'
  | 'warning'
  // aliases legados
  | 'zinc'
  | 'amber'
  | 'green'
  | 'red';

const TONE_CLASS: Record<BadgeTone, string> = {
  default: '',
  secondary: '',
  outline: '',
  destructive: '',
  success: 'border-green-900 bg-green-300 text-green-900',
  warning: 'border-yellow-900 bg-yellow-300 text-yellow-900',
  zinc: 'bg-muted text-foreground',
  amber: 'bg-primary text-primary-foreground',
  green: 'border-green-900 bg-green-300 text-green-900',
  red: 'border-red-900 bg-red-300 text-red-900',
};

const TONE_VARIANT: Partial<Record<BadgeTone, 'default' | 'secondary' | 'outline' | 'destructive'>> = {
  default: 'default',
  secondary: 'secondary',
  outline: 'outline',
  destructive: 'destructive',
  zinc: 'outline',
  amber: 'default',
  green: 'outline',
  red: 'destructive',
  success: 'outline',
  warning: 'outline',
};

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const variant =
    tone === 'success' || tone === 'warning'
      ? 'outline'
      : (TONE_VARIANT[tone] ?? 'outline');
  return (
    <KitBadge variant={variant} className={cn(TONE_CLASS[tone], className)}>
      {children}
    </KitBadge>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <Alert status="error">
      <AlertTitle>Ops</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
