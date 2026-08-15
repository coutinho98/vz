import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventItem } from '../../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../../api/client';
import { Badge, ErrorBox, Spinner } from '../../components/ui';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusBadge = (status: EventItem['status']) =>
  status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warning' : 'destructive';

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
          <h1 className="font-head text-3xl tracking-tight">Meus eventos</h1>
          <p className="mt-1 text-muted-foreground">
            Publique, cancele e acompanhe os eventos que você organiza.
          </p>
        </div>
        <Button render={<Link to="/organizador/novo" />}>+ Criar evento</Button>
      </div>

      {isPending && <Spinner label="Carregando eventos…" />}
      {isError && <ErrorBox message={apiErrorMessage(error)} />}

      {events && events.length === 0 && (
        <div className="rounded border-2 border-dashed border-black/40 py-16 text-center text-muted-foreground">
          Você ainda não criou eventos. Comece escolhendo um filme ou show no catálogo.
        </div>
      )}

      {events && events.length > 0 && (
        <div className="overflow-x-auto rounded border-2 border-black bg-card shadow-md">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Vendidos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <p className="font-bold">{event.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {event.venue} · {event.city} ·{' '}
                      {event.seatingMode === 'SEATED'
                        ? `${event.rowsCount}×${event.seatsPerRow}`
                        : `pista ${event.capacity}p`}
                    </p>
                  </TableCell>
                  <TableCell>{formatDateTime(event.startsAt)}</TableCell>
                  <TableCell className="font-bold">{formatBRL(event.priceCents)}</TableCell>
                  <TableCell>{event._count?.tickets ?? 0}</TableCell>
                  <TableCell>
                    <Badge tone={statusBadge(event.status)}>{statusLabel(event.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {event.status === 'DRAFT' && (
                        <>
                          <Button
                            size="xs"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => act.mutate({ id: event.id, action: 'publish' })}
                          >
                            Publicar
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            render={<Link to={`/organizador/${event.id}/editar`} />}
                          >
                            Editar
                          </Button>
                        </>
                      )}
                      {event.status === 'PUBLISHED' && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            render={<Link to={`/portaria/${event.id}`} />}
                          >
                            Portaria
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => act.mutate({ id: event.id, action: 'cancel' })}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {act.isError && <ErrorBox message={apiErrorMessage(act.error)} />}
    </div>
  );
}
