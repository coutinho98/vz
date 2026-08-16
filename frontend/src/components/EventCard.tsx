import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import { formatBRL, formatDateTime } from '../api/client';
import { Badge, Poster } from './ui';
import { Card, CardContent } from '@/components/ui/card';

export default function EventCard({ event }: { event: EventItem }) {
  return (
    <Link to={`/eventos/${event.id}`} className="group block">
      <Card className="h-full p-0 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="flex">
          {/* pôster inteiro, sem corte — altura natural da imagem 2:3 */}
          <div className="w-28 shrink-0 border-r-2 border-black sm:w-36">
            <Poster
              src={event.posterUrl}
              alt={event.title}
              className="h-auto border-0 transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>

          <CardContent className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
                {event.category === 'SHOW' ? 'Show' : 'Filme'}
              </Badge>
              <Badge tone="outline">
                {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
              </Badge>
            </div>
            <h3 className="line-clamp-2 font-head text-base leading-snug">
              {event.title}
            </h3>
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {event.venue} · {event.city}
            </p>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {formatDateTime(event.startsAt)}
            </p>

            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              {event.availability && (
                <span
                  className={`font-mono text-[11px] uppercase tracking-wide ${
                    event.availability.available > 0
                      ? 'text-muted-foreground'
                      : 'font-bold text-destructive'
                  }`}
                >
                  {event.availability.available > 0
                    ? `${event.availability.available} disponíveis`
                    : 'Esgotado'}
                </span>
              )}
              <span className="rounded border-2 border-black bg-primary px-2 py-0.5 font-head text-sm">
                {formatBRL(event.priceCents)}
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
