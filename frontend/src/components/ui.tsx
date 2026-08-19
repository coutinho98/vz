import { Badge as KitBadge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const POSTER_THEMES = [
  { bg: 'bg-primary', ink: 'text-primary-foreground' },
  { bg: 'bg-accent', ink: 'text-foreground' },
  { bg: 'bg-[#c5d5ff]', ink: 'text-foreground' },
  { bg: 'bg-muted', ink: 'text-foreground' },
];

function posterSeed(alt: string) {
  let hash = 0;
  for (const ch of alt) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

// poster tipográfico pra shows ou itens sem imagem
function TypographicPoster({ title, genre }: { title: string; genre?: string }) {
  const theme = POSTER_THEMES[posterSeed(title) % POSTER_THEMES.length];
  const words = title.replace(/[—–-]/g, ' ').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > 10) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return (
    <div
      className={`flex aspect-[2/3] w-full flex-col justify-between border-2 border-black p-3 ${theme.bg} ${theme.ink}`}
    >
      <div className="flex flex-1 flex-col justify-center">
        {lines.slice(0, 4).map((line, i) => (
          <span
            key={i}
            className="font-head uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: `clamp(1rem, ${18 / Math.max(line.length, 6)}em, 2.6rem)` }}
          >
            {line}
          </span>
        ))}
      </div>
      {genre && (
        <p className="border-t-2 border-current/40 pt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
          {genre}
        </p>
      )}
    </div>
  );
}

export function Poster({
  src,
  alt,
  genre,
  className = '',
}: {
  src: string | null;
  alt: string;
  genre?: string;
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
  return <TypographicPoster title={alt} genre={genre} />;
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
  | 'success'
  | 'warning'
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
