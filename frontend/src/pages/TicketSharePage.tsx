import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { PublicTicket } from '../api/types';
import { api, formatDateTime } from '../api/client';
import { Badge, ErrorBox, Poster, Spinner } from '../components/ui';

export default function TicketSharePage() {
  const { code } = useParams<{ code: string }>();
  const { data: ticket, isPending, isError } = useQuery<PublicTicket>({
    queryKey: ['ticket', code],
    queryFn: async () => (await api.get<PublicTicket>(`/tickets/code/${code}`)).data,
    retry: false,
  });

  const shareUrl = code ? `${window.location.origin}/t/${code}` : '';

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Ingressa
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Seu ingresso</h1>
      </div>

      {isPending && <Spinner label="Buscando ingresso…" />}
      {isError && (
        <div className="space-y-4">
          <ErrorBox message="Ingresso não encontrado. Verifique o link." />
          <Link to="/" className="block text-center text-sm text-amber-400 hover:underline">
            Ir para a plataforma
          </Link>
        </div>
      )}

      {ticket && (
        <>
          <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
            <div className="relative h-44">
              <Poster src={ticket.event.posterUrl} alt={ticket.event.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30" />
              <div className="absolute bottom-4 left-5 right-5">
                <Badge tone={ticket.event.category === 'SHOW' ? 'amber' : 'zinc'}>
                  {ticket.event.category === 'SHOW' ? 'Show' : 'Filme'}
                </Badge>
                <h2 className="mt-1.5 text-xl font-bold leading-tight">
                  {ticket.event.title}
                </h2>
              </div>
            </div>

            <div className="space-y-3 border-b border-dashed border-zinc-700 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Quando</span>
                <span className="font-medium">{formatDateTime(ticket.event.startsAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Onde</span>
                <span className="font-medium">
                  {ticket.event.venue} — {ticket.event.city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Titular</span>
                <span className="font-medium">{ticket.holderFirstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {ticket.seatLabel ? 'Lugar' : 'Pista'}
                </span>
                <span className="font-semibold text-amber-400">
                  {ticket.seatLabel ?? `${ticket.quantity} pessoa(s)`}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-6">
              <div
                className={`rounded-2xl p-3 ${
                  ticket.status === 'VALID' ? 'bg-white' : 'bg-zinc-700 opacity-60'
                }`}
              >
                <QRCodeSVG value={shareUrl} size={168} level="M" />
              </div>
              <code className="text-sm tracking-[0.15em] text-zinc-300">{ticket.code}</code>
              <Badge
                tone={
                  ticket.status === 'VALID'
                    ? 'green'
                    : ticket.status === 'USED'
                      ? 'zinc'
                      : 'red'
                }
              >
                {ticket.status === 'VALID'
                  ? 'Válido — pronto para entrada'
                  : ticket.status === 'USED'
                    ? `Utilizado${ticket.checkedInAt ? ' em ' + formatDateTime(ticket.checkedInAt) : ''}`
                    : 'Cancelado'}
              </Badge>
            </div>
          </article>

          <div className="text-center">
            <button
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({ title: 'Meu ingresso', url: shareUrl });
                } else {
                  void navigator.clipboard?.writeText(shareUrl);
                }
              }}
              className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              Compartilhar ingresso
            </button>
          </div>
        </>
      )}
    </div>
  );
}
