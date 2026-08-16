import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { EventItem } from '../api/types';
import { formatBRL } from '../api/client';
import { Badge, Poster } from './ui';
import { Card, CardContent } from '@/components/ui/card';

const LOW_STOCK_THRESHOLD = 25;

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

  return (
    <Link
      to={`/eventos/${event.id}`}
      className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Card className="relative h-full p-0 transition-[box-shadow,transform] duration-300 ease-out group-hover:-translate-y-[3px] group-hover:shadow-lg">
        <div className="flex h-full">
          {/* pôster com perfuração de ingresso no lado direito */}
          <div
            className={`relative w-28 shrink-0 overflow-hidden border-r-2 border-dashed border-black sm:w-36 ${
              soldOut ? 'grayscale' : ''
            }`}
          >
            <Poster
              src={event.posterUrl}
              alt={event.title}
              className="h-full border-0 object-cover"
            />

            {/* selo de data estilo calendário */}
            <div className="absolute left-1.5 top-1.5 flex size-11 flex-col items-center justify-center border-2 border-black bg-primary text-primary-foreground shadow-sm sm:size-12">
              <span className="font-head text-base leading-none sm:text-lg">{day}</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
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

          {/* recortes semicirculares da perfuração */}
          <span
            aria-hidden
            className="absolute left-28 top-0 z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />
          <span
            aria-hidden
            className="absolute bottom-0 left-28 z-10 size-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />

          <CardContent className="flex min-w-0 flex-1 flex-col gap-1.5 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
                {event.category === 'SHOW' ? 'Show' : 'Filme'}
              </Badge>
              <Badge tone="outline">
                {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
              </Badge>
            </div>
            <h3 className="line-clamp-2 font-head text-base leading-snug sm:text-lg">
              {event.title}
            </h3>
            <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {event.venue} · {event.city}
              </span>
            </p>

            <div className="mt-auto flex items-end justify-between gap-3 border-t-2 border-dashed border-black/25 pt-2">
              <div className="min-w-0 space-y-0.5">
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {weekday} {day} {month.toLowerCase()} · {time}
                </p>
                {event.availability && (
                  <p
                    className={`font-mono text-[11px] uppercase tracking-wide ${
                      soldOut
                        ? 'font-bold text-destructive'
                        : lowStock
                          ? 'font-bold text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {soldOut
                      ? 'Esgotado'
                      : lowStock
                        ? `Últimos ${available} ingressos`
                        : `${available} disponíveis`}
                  </p>
                )}
              </div>
              <span className="shrink-0 border-2 border-black bg-primary px-2.5 py-1 font-head text-sm shadow-sm transition-colors duration-200 group-hover:bg-primary-hover">
                {formatBRL(event.priceCents)}
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
