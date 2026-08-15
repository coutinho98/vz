import { QRCodeSVG } from 'qrcode.react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Ticket } from '../api/types';
import { api, formatDateTime } from '../api/client';
import { Badge, Poster, Spinner } from '../components/ui';

function TicketCard({ ticket, highlight }: { ticket: Ticket; highlight: boolean }) {
  const shareUrl = `${window.location.origin}/t/${ticket.code}`;

  return (
    <article
      className={`grid gap-0 overflow-hidden rounded-2xl border sm:grid-cols-[1fr_auto] ${
        highlight ? 'border-amber-400/60' : 'border-zinc-800'
      } bg-zinc-900/40`}
    >
      <div className="flex gap-4 p-5">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg">
          <Poster src={ticket.event.posterUrl} alt={ticket.event.title} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ticket.status === 'VALID' ? 'green' : ticket.status === 'USED' ? 'zinc' : 'red'}>
              {ticket.status === 'VALID'
                ? 'Válido'
                : ticket.status === 'USED'
                  ? 'Utilizado'
                  : 'Cancelado'}
            </Badge>
            <Badge tone={ticket.event.category === 'SHOW' ? 'amber' : 'zinc'}>
              {ticket.event.category === 'SHOW' ? 'Show' : 'Filme'}
            </Badge>
          </div>
          <h3 className="truncate font-semibold">{ticket.event.title}</h3>
          <p className="text-sm text-zinc-400">
            {formatDateTime(ticket.event.startsAt)} · {ticket.event.venue}
          </p>
          <p className="text-sm">
            {ticket.seatLabel ? (
              <>
                Lugar <strong className="text-amber-400">{ticket.seatLabel}</strong>
              </>
            ) : (
              <>
                Pista — <strong className="text-amber-400">{ticket.quantity}p</strong>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <Link
              to={`/t/${ticket.code}`}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-amber-400 hover:text-amber-300"
            >
              Abrir ingresso
            </Link>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(shareUrl);
              }}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-amber-400 hover:text-amber-300"
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-dashed border-zinc-700 bg-zinc-950/60 p-5 sm:border-l sm:border-t-0">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={shareUrl} size={104} level="M" />
          </div>
          <code className="text-[11px] tracking-wider text-zinc-400">{ticket.code}</code>
        </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus ingressos</h1>
        <p className="mt-1 text-zinc-400">
          Apresente o QR Code na entrada ou compartilhe pelo link.
        </p>
      </div>

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
        <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-400">Você ainda não tem ingressos.</p>
          <Link to="/" className="mt-2 inline-block font-medium text-amber-400 hover:underline">
            Explorar eventos →
          </Link>
        </div>
      )}
    </div>
  );
}
