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
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  const initial = alt.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 ${className}`}
    >
      <span className="text-4xl font-black text-zinc-700">{initial}</span>
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = 'zinc',
}: {
  children: React.ReactNode;
  tone?: 'zinc' | 'amber' | 'green' | 'red';
}) {
  const tones = {
    zinc: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
    amber: 'border-amber-500/40 bg-amber-400/10 text-amber-300',
    green: 'border-emerald-500/40 bg-emerald-400/10 text-emerald-300',
    red: 'border-red-500/40 bg-red-400/10 text-red-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}
