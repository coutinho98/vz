import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import { formatBRL, formatDateTime } from '../api/client';
import { Badge, Poster } from './ui';

export default function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      to={`/eventos/${event.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="aspect-[16/9] overflow-hidden">
        <Poster
          src={event.posterUrl}
          alt={event.title}
          className="transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Badge tone={event.category === 'SHOW' ? 'amber' : 'zinc'}>
            {event.category === 'SHOW' ? 'Show' : 'Filme'}
          </Badge>
          <Badge>{event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}</Badge>
        </div>
        <h3 className="line-clamp-1 font-semibold leading-snug">{event.title}</h3>
        <p className="line-clamp-1 text-sm text-zinc-400">
          {event.venue} · {event.city}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-zinc-400">{formatDateTime(event.startsAt)}</span>
          <span className="font-bold text-amber-400">{formatBRL(event.priceCents)}</span>
        </div>
        {event.availability && (
          <p className="text-xs text-zinc-500">
            {event.availability.available > 0
              ? `${event.availability.available} disponíveis`
              : 'Esgotado'}
          </p>
        )}
      </div>
    </Link>
  );
}
