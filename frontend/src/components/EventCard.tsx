import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import { formatBRL, formatDateTime } from '../api/client';
import { Badge, Poster } from './ui';
import { Card, CardContent } from '@/components/ui/card';

export default function EventCard({ event }: { event: EventItem }) {
  return (
    <Link to={`/eventos/${event.id}`} className="group block">
      <Card className="h-full transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="aspect-[16/9] overflow-hidden border-b-2 border-black">
          <Poster
            src={event.posterUrl}
            alt={event.title}
            className="transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </div>
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
              {event.category === 'SHOW' ? 'Show' : 'Filme'}
            </Badge>
            <Badge tone="outline">
              {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
            </Badge>
          </div>
          <h3 className="line-clamp-1 font-head text-base leading-snug">{event.title}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {event.venue} · {event.city}
          </p>
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground">{formatDateTime(event.startsAt)}</span>
            <span className="rounded border-2 border-black bg-primary px-2 py-0.5 font-head text-sm">
              {formatBRL(event.priceCents)}
            </span>
          </div>
          {event.availability && (
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {event.availability.available > 0
                ? `${event.availability.available} disponíveis`
                : 'Esgotado'}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
