import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventItem } from '../../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../../api/client';
import { Badge, ErrorBox, Spinner } from '../../components/ui';

const statusBadge = (status: EventItem['status']) =>
  status === 'PUBLISHED' ? 'green' : status === 'DRAFT' ? 'amber' : 'red';

const statusLabel = (status: EventItem['status']) =>
  status === 'PUBLISHED' ? 'Publicado' : status === 'DRAFT' ? 'Rascunho' : 'Cancelado';

export default function OrganizerEventsPage() {
  const queryClient = useQueryClient();

  const { data: events, isPending, isError, error } = useQuery<EventItem[]>({
    queryKey: ['organizer-events'],
    queryFn: async () => (await api.get<EventItem[]>('/events/mine')).data,
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'publish' | 'cancel' }) => {
      await api.post(`/events/${id}/${action}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizer-events'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus eventos</h1>
          <p className="mt-1 text-zinc-400">
            Publique, cancele e acompanhe os eventos que você organiza.
          </p>
        </div>
        <Link
          to="/organizador/novo"
          className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          + Criar evento
        </Link>
      </div>

      {isPending && <Spinner label="Carregando eventos…" />}
      {isError && <ErrorBox message={apiErrorMessage(error)} />}

      {events && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-zinc-400">
          Você ainda não criou eventos. Comece escolhendo um filme ou show no catálogo.
        </div>
      )}

      {events && events.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Vendidos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-zinc-500">
                      {event.venue} · {event.city} ·{' '}
                      {event.seatingMode === 'SEATED'
                        ? `${event.rowsCount}×${event.seatsPerRow} assentos`
                        : `pista ${event.capacity}p`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDateTime(event.startsAt)}
                  </td>
                  <td className="px-4 py-3">{formatBRL(event.priceCents)}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {event._count?.tickets ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusBadge(event.status)}>{statusLabel(event.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {event.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => act.mutate({ id: event.id, action: 'publish' })}
                            className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                          >
                            Publicar
                          </button>
                          <Link
                            to={`/organizador/${event.id}/editar`}
                            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-500"
                          >
                            Editar
                          </Link>
                        </>
                      )}
                      {event.status === 'PUBLISHED' && (
                        <>
                          <Link
                            to={`/portaria/${event.id}`}
                            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-amber-400 hover:text-amber-300"
                          >
                            Portaria
                          </Link>
                          <button
                            onClick={() => act.mutate({ id: event.id, action: 'cancel' })}
                            className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {act.isError && <ErrorBox message={apiErrorMessage(act.error)} />}
    </div>
  );
}
