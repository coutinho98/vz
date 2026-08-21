import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { EventItem } from '../api/types';
import { formatBRL } from '../api/client';
import { Badge, Poster } from './ui';
import { Card, CardContent } from '@/components/ui/card';

const LOW_STOCK_THRESHOLD = 20;

export default function EventCard({ event }: { event: EventItem }) {
  const start = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(start);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(start)
    .replace('.', '')
    .toUpperCase();
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(start)
    .replace('.', '');
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);

  const available = event.availability?.available;
  const soldOut = available !== undefined && available === 0;
  const lowStock = available !== undefined && available > 0 && available <= LOW_STOCK_THRESHOLD;

  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const started = start.getTime() < now.getTime();

  return (
    <Link
      to={`/eventos/${event.id}`}
      className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Card className="relative h-full overflow-hidden p-0 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="flex h-full min-h-[180px] sm:min-h-[200px]">
          <div
            className={`relative w-28 shrink-0 overflow-hidden border-r-2 border-dashed border-black sm:w-36 ${
              soldOut ? 'grayscale' : ''
            }`}
          >
            <Poster
              src={event.posterUrl}
              alt={event.title}
              genre={event.category === 'SHOW' ? 'ao vivo' : 'cinema'}
              className="h-full w-full object-cover"
            />

            <div className="absolute left-1.5 top-1.5 flex size-10 flex-col items-center justify-center border-2 border-black bg-primary text-primary-foreground shadow-sm sm:size-12">
              <span className="font-head text-sm leading-none sm:text-lg">{day}</span>
              <span className="font-mono text-[8px] font-bold uppercase tracking-widest sm:text-[9px]">
                {month}
              </span>
            </div>

            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rotate-[-6deg] border-2 border-black bg-destructive px-3 py-1 font-head text-xs uppercase tracking-widest text-destructive-foreground shadow-md">
                  Esgotado
                </span>
              </div>
            )}
          </div>

          <span
            aria-hidden
            className="absolute left-28 top-0 z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />
          <span
            aria-hidden
            className="absolute bottom-0 left-28 z-10 size-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />

          <CardContent className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
                {event.category === 'SHOW' ? 'Show' : 'Filme'}
              </Badge>
              <Badge tone="outline">
                {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
              </Badge>
              {isToday && (started ? <Badge tone="success">Em andamento</Badge> : <Badge tone="amber">Hoje</Badge>)}
            </div>
            <h3 className="line-clamp-2 font-head text-base leading-snug sm:text-lg">
              {event.title}
            </h3>
            <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {event.venue}{event.room ? ` (${event.room})` : ''} · {event.city}
              </span>
            </p>

            {event.sessionCount && event.sessionCount > 1 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                  {event.sessionCount} sessões:
                </span>
                {event.sessions?.slice(0, 2).map((s) => (
                  <span
                    key={s.id}
                    className="border border-black bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold"
                  >
                    {new Intl.DateTimeFormat('pt-BR', {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                      .format(new Date(s.startsAt))
                      .replace('.', '')}
                  </span>
                ))}
                {(event.sessionCount ?? 0) > 2 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    +{(event.sessionCount ?? 0) - 2}
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-black/25 pt-2">
              <div className="min-w-0">
                {(!event.sessionCount || event.sessionCount <= 1) ? (
                  <p className="truncate font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {weekday} {day} {month.toLowerCase()} · {time}
                  </p>
                ) : (
                  <p className="truncate font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Em cartaz
                  </p>
                )}
                {event.availability && (soldOut || lowStock) && (
                  <p
                    className={`font-mono text-[10px] font-bold uppercase tracking-wide ${
                      soldOut ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {soldOut ? 'Esgotado' : `Últimos ${available} un`}
                  </p>
                )}
              </div>

              <span className="shrink-0 border-2 border-black bg-primary px-2.5 py-1 font-head text-xs shadow-sm transition-colors duration-200 group-hover:bg-primary-hover sm:text-sm">
                {formatBRL(event.priceCents)}
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
