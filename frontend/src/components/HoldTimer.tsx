import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldTimerProps {
  expiresAt: string | Date;
  totalDurationSeconds?: number;
  onExpire?: () => void;
  className?: string;
}

export function HoldTimer({
  expiresAt,
  totalDurationSeconds = 600, // 10 minutos padrão
  onExpire,
  className,
}: HoldTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const remaining = Math.max(0, Math.floor(diff / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        onExpire?.();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = Math.min(
    100,
    Math.max(0, (secondsLeft / totalDurationSeconds) * 100)
  );

  const isUrgent = secondsLeft > 0 && secondsLeft <= 120; // últimos 2 minutos
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded border-2 border-black p-3.5 shadow-md transition-all',
        isExpired
          ? 'bg-destructive/20 border-destructive'
          : isUrgent
            ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg'
            : 'bg-primary/20 text-foreground',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <AlertTriangle className="size-4 shrink-0 text-destructive-foreground animate-bounce" />
          ) : (
            <Clock className="size-4 shrink-0 text-foreground" />
          )}
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            {isExpired
              ? 'Tempo de reserva esgotado'
              : isUrgent
                ? 'Atenção: seus assentos serão liberados em breve!'
                : 'Assentos bloqueados para você'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-sm font-black tracking-widest sm:text-base">
          <span className="text-xs font-semibold opacity-75">TEMPO RESTANTE:</span>
          <span
            className={cn(
              'rounded border-2 border-black px-2 py-0.5 shadow-sm',
              isUrgent ? 'bg-background text-foreground' : 'bg-background text-foreground'
            )}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Barra de progresso visual de Hold */}
      {!isExpired && (
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full border border-black bg-background/50">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-linear',
              isUrgent ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
