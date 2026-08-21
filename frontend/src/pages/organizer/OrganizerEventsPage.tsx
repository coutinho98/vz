import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventItem } from '../../api/types';
import { api, apiErrorMessage, formatBRL } from '../../api/client';
import { Badge, ErrorBox, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatSessionDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '');
  return `${weekday}, ${day}/${month}/${year} às ${hours}:${minutes}`;
}

export default function OrganizerEventsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cancelIds, setCancelIds] = useState<string[] | null>(null);

  const { data: events, isPending, isError, error } = useQuery<EventItem[]>({
    queryKey: ['organizer-events'],
    queryFn: async () => (await api.get<EventItem[]>('/events/mine')).data,
  });

  const act = useMutation({
    mutationFn: async ({
      ids,
      action,
    }: {
      ids: string[];
      action: 'publish' | 'cancel';
    }) => {
      for (const id of ids) {
        await api.post(`/events/${id}/${action}`);
      }
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      void queryClient.invalidateQueries({ queryKey: ['organizer-stats'] });
      if (vars.action === 'publish') {
        toast({
          title:
            vars.ids.length > 1
              ? `${vars.ids.length} sessões publicadas`
              : 'Sessão publicada',
          description: 'O evento já está visível na vitrine.',
        });
      } else {
        toast({
          title:
            vars.ids.length > 1
              ? `${vars.ids.length} sessões canceladas`
              : 'Sessão cancelada',
          description: 'Ingressos vendidos foram estornados.',
        });
      }
    },
    onError: (err) => {
      toast({ title: 'Não foi possível concluir', description: apiErrorMessage(err), variant: 'error' });
    },
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
        <Button nativeButton={false} render={<Link to="/organizador/novo" />}>+ Criar evento</Button>
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
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Vendidos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const sessions = event.sessions ?? [];
                const drafts = sessions.filter((s) => s.status === 'DRAFT');
                const published = sessions.filter((s) => s.status === 'PUBLISHED');
                const totalSold = sessions.reduce((sum, s) => sum + (s.sold ?? 0), 0);
                const allDraft = drafts.length === sessions.length;
                const allPublished = published.length === sessions.length;

                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <p className="font-bold">{event.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {event.venue} · {event.city} ·{' '}
                        {event.seatingMode === 'SEATED'
                          ? `${event.rowsCount}×${event.seatsPerRow}`
                          : `pista ${event.capacity}p`}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {allDraft && <Badge tone="zinc">Não lançado</Badge>}
                        {(event.sessionCount ?? 0) > 1 && (
                          <Badge tone="outline">
                            {event.sessionCount} sessões
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {sessions.map((s) => (
                          <p key={s.id} className="flex items-center gap-1.5 font-mono text-xs">
                            <span
                              className={`inline-block size-2 shrink-0 border border-black ${
                                s.status === 'PUBLISHED'
                                  ? 'bg-green-500'
                                  : s.status === 'DRAFT'
                                    ? 'bg-yellow-400'
                                    : 'bg-destructive'
                              }`}
                              aria-hidden
                            />
                            <span className={s.status === 'CANCELLED' ? 'text-muted-foreground line-through' : ''}>
                              {formatSessionDateTime(s.startsAt)}
                            </span>
                            {s.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                aria-label={`Cancelar sessão de ${formatSessionDateTime(s.startsAt)}`}
                                title={`Cancelar sessão de ${formatSessionDateTime(s.startsAt)}`}
                                disabled={act.isPending}
                                onClick={() => setCancelIds([s.id])}
                                className="flex size-4 cursor-pointer items-center justify-center border border-black bg-card text-[9px] font-bold text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                              >
                                ×
                              </button>
                            )}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{formatBRL(event.priceCents)}</TableCell>
                    <TableCell>{totalSold}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {allDraft && (
                          <>
                            <Button
                              size="xs"
                              className="bg-green-500 hover:bg-green-600"
                              disabled={act.isPending}
                              onClick={() =>
                                act.mutate({
                                  ids: sessions.map((s) => s.id),
                                  action: 'publish',
                                })
                              }
                            >
                              Publicar {sessions.length > 1 ? 'todas' : ''}
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              nativeButton={false} render={<Link to={`/organizador/${event.id}/editar`} />}
                            >
                              Editar
                            </Button>
                          </>
                        )}
                        {published.length > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              nativeButton={false} render={<Link to={`/portaria/${published[0].id}`} />}
                            >
                              Portaria
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              disabled={act.isPending}
                              onClick={() => setCancelIds(published.map((s) => s.id))}
                            >
                              Cancelar {published.length > 1 ? 'todas' : ''}
                            </Button>
                          </>
                        )}
                        {allPublished && (
                          <Badge tone="success">Publicado</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {act.isError && <ErrorBox message={apiErrorMessage(act.error)} />}

      <AlertDialog open={!!cancelIds} onOpenChange={(o) => !o && setCancelIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancelar {(cancelIds?.length ?? 0) > 1 ? `${cancelIds!.length} sessões` : 'sessão'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ingressos vendidos serão estornados pela forma de pagamento
              original e a sessão sai da vitrine. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" disabled={act.isPending}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              disabled={act.isPending}
              onClick={() => {
                if (cancelIds) act.mutate({ ids: cancelIds, action: 'cancel' });
                setCancelIds(null);
              }}
            >
              {act.isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
