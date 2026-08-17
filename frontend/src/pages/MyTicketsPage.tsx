import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import type { Reservation, Ticket } from '../api/types';
import { api, formatBRL, formatDateTime } from '../api/client';
import { Badge, Poster, Spinner } from '../components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function useCountdown(expiresAt: string) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const timer = setInterval(
      () =>
        setLeft(
          Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [expiresAt]);
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return { left, label: `${m}:${s}` };
}

function PendingReservationCard({ reservation }: { reservation: Reservation }) {
  const queryClient = useQueryClient();
  const { left, label } = useCountdown(reservation.expiresAt);

  const cancel = useMutation({
    mutationFn: async () => {
      await api.delete(`/reservations/${reservation.id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['seats'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const seatsLabel = reservation.seats?.length
    ? reservation.seats.map((s) => `${s.row}${s.number}`).join(', ')
    : `${reservation.quantity} ingresso(s) pista`;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning" className="gap-1">
              <Timer className="size-3" aria-hidden />
              reserva pendente
            </Badge>
            <Badge tone={left > 120 ? 'outline' : 'destructive'} className="font-mono">
              {label}
            </Badge>
          </div>
          <p className="truncate font-head text-base">{reservation.event.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(reservation.event.startsAt)} · {seatsLabel} ·{' '}
            {formatBRL(reservation.totalCents)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" nativeButton={false} render={<Link to={`/checkout/${reservation.id}`} />}>
            Pagar agora
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? 'Cancelando…' : 'Cancelar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Barcode({ code, className = '' }: { code: string; className?: string }) {
  const widths = code.split('').map((ch) => 2 + (ch.charCodeAt(0) % 4));
  return (
    <div className={`flex h-6 items-end gap-[2px] ${className}`} aria-hidden="true">
      {widths.map((w, i) => (
        <span key={i} className="inline-block h-full bg-black" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}

function TicketCard({ ticket, highlight }: { ticket: Ticket; highlight: boolean }) {
  const shareUrl = `${window.location.origin}/t/${ticket.code}`;

  return (
    <article
      className={`grid overflow-hidden rounded border-2 border-black bg-card shadow-md sm:grid-cols-[1fr_auto] ${
        highlight ? 'ring-4 ring-primary' : ''
      }`}
    >
      <div className="flex gap-4 p-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden">
          <Poster src={ticket.event.posterUrl} alt={ticket.event.title} className="border-0" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={ticket.status === 'VALID' ? 'success' : ticket.status === 'USED' ? 'secondary' : 'destructive'}>
              {ticket.status === 'VALID' ? 'Válido' : ticket.status === 'USED' ? 'Utilizado' : 'Cancelado'}
            </Badge>
            <Badge tone={ticket.event.category === 'SHOW' ? 'default' : 'secondary'}>
              {ticket.event.category === 'SHOW' ? 'Show' : 'Filme'}
            </Badge>
          </div>
          <h3 className="truncate font-head text-base leading-snug">{ticket.event.title}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(ticket.event.startsAt)} · {ticket.event.venue}
          </p>
          <p className="text-sm">
            {ticket.seatLabel ? (
              <>
                Lugar <span className="rounded border-2 border-black bg-primary px-1.5 font-head">{ticket.seatLabel}</span>
              </>
            ) : (
              <>
                Pista <span className="text-muted-foreground">· ingresso individual</span>
              </>
            )}
            {ticket.kind === 'HALF' && (
              <span className="ml-2 rounded border-2 border-black bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                meia
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link to={`/t/${ticket.code}`} />}>
              Abrir ingresso
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => void navigator.clipboard?.writeText(shareUrl)}
            >
              Copiar link
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center gap-2 border-t-2 border-dashed border-black bg-background p-4 sm:border-l-2 sm:border-t-0">
        <span className="absolute -left-[13px] -top-[11px] hidden h-5 w-5 rounded-full border-2 border-black bg-background sm:block" />
        <span className="absolute -bottom-[11px] -left-[13px] hidden h-5 w-5 rounded-full border-2 border-black bg-background sm:block" />
        <div className="rounded border-2 border-black bg-white p-2">
          <QRCodeSVG value={shareUrl} size={96} level="M" />
        </div>
        <code className="font-mono text-[11px] font-bold tracking-wider">{ticket.code}</code>
        <Barcode code={ticket.code} />
      </div>
    </article>
  );
}

export default function MyTicketsPage() {
  const location = useLocation();
  const highlight = (location.state as { highlight?: string[] } | null)?.highlight ?? [];

  const { data: tickets, isPending } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: async () => (await api.get<Ticket[]>('/tickets/mine')).data,
  });

  const { data: reservations } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations/mine')).data,
    refetchInterval: 30_000, // pega expirações automáticas sem refresh
  });
  const pending = reservations?.filter((r) => r.status === 'PENDING') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl tracking-tight">Meus ingressos</h1>
        <p className="mt-1 text-muted-foreground">
          Apresente o QR Code na entrada ou compartilhe pelo link.
        </p>
      </div>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Reservas aguardando pagamento
          </h2>
          {pending.map((reservation) => (
            <PendingReservationCard key={reservation.id} reservation={reservation} />
          ))}
          <p className="text-xs text-muted-foreground">
            Os lugares ficam bloqueados só para você até o timer zerar. Depois
            liberam automaticamente.
          </p>
        </section>
      )}

      {isPending ? (
        <Spinner label="Carregando ingressos…" />
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              highlight={highlight.includes(ticket.code)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border-2 border-dashed border-black/40 py-16 text-center">
          <p className="text-muted-foreground">Você ainda não tem ingressos.</p>
          <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<Link to="/" />}>
            Explorar eventos →
          </Button>
        </div>
      )}
    </div>
  );
}
