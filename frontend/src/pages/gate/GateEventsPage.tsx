import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { EventItem } from '../../api/types';
import { api, formatDateTime } from '../../api/client';
import { Badge, Spinner } from '../../components/ui';

export default function GateEventsPage() {
  const { data: events, isPending } = useQuery<EventItem[]>({
    queryKey: ['gate-events'],
    queryFn: async () => (await api.get<EventItem[]>('/gate/events')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portaria</h1>
        <p className="mt-1 text-zinc-400">
          Selecione o evento para abrir a validação de ingressos na entrada.
        </p>
      </div>

      {isPending && <Spinner label="Carregando eventos…" />}

      {events && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-zinc-400">
          Nenhum evento publicado. Publique um evento primeiro.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {events?.map((event) => (
          <Link
            key={event.id}
            to={`/portaria/${event.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-amber-400/60"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge tone={event.category === 'SHOW' ? 'amber' : 'zinc'}>
                {event.category === 'SHOW' ? 'Show' : 'Filme'}
              </Badge>
              <span className="text-xs text-zinc-500">
                {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
              </span>
            </div>
            <h2 className="mt-3 font-semibold">{event.title}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {formatDateTime(event.startsAt)} · {event.venue}
            </p>
            <p className="mt-3 text-sm font-medium text-amber-400">
              Abrir portaria →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
