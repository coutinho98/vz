import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { EventItem } from '../../api/types';
import { api, formatDateTime } from '../../api/client';
import { Badge, Spinner } from '../../components/ui';
import { Card, CardContent } from '@/components/ui/card';

export default function GateEventsPage() {
  const { data: events, isPending } = useQuery<EventItem[]>({
    queryKey: ['gate-events'],
    queryFn: async () => (await api.get<EventItem[]>('/gate/events')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl tracking-tight">Portaria</h1>
        <p className="mt-1 text-muted-foreground">
          Selecione o evento para abrir a validação de ingressos na entrada.
        </p>
      </div>

      {isPending && <Spinner label="Carregando eventos…" />}

      {events && events.length === 0 && (
        <div className="rounded border-2 border-dashed border-black/40 py-16 text-center text-muted-foreground">
          Nenhum evento publicado. Publique um evento primeiro.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {events?.map((event) => (
          <Link key={event.id} to={`/portaria/${event.id}`} className="group block">
            <Card className="h-full transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
                    {event.category === 'SHOW' ? 'Show' : 'Filme'}
                  </Badge>
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {event.seatingMode === 'SEATED' ? 'assentos' : 'pista'}
                  </span>
                </div>
                <h2 className="font-head text-base leading-snug">{event.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(event.startsAt)} · {event.venue}
                </p>
                <p className="font-head text-sm text-foreground">Abrir portaria →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
