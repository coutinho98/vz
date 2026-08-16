import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { PublicTicket } from '../api/types';
import { api, formatDateTime } from '../api/client';
import { Badge, ErrorBox, Poster, Spinner } from '../components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          ingressa apresenta
        </p>
        <h1 className="mt-1 font-head text-2xl tracking-tight">Seu ingresso</h1>
      </div>

      {isPending && <Spinner label="Buscando ingresso…" />}
      {isError && (
        <div className="space-y-4">
          <ErrorBox message="Ingresso não encontrado. Verifique o link." />
          <Link to="/" className="block text-center text-sm font-bold underline underline-offset-4">
            Ir para a plataforma
          </Link>
        </div>
      )}

      {ticket && (
        <>
          <Card className="overflow-hidden p-0">
            <div className="relative h-44">
              <Poster src={ticket.event.posterUrl} alt={ticket.event.title} className="border-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <Badge tone={ticket.event.category === 'SHOW' ? 'default' : 'secondary'}>
                  {ticket.event.category === 'SHOW' ? 'Show' : 'Filme'}
                </Badge>
                <h2 className="mt-1.5 font-head text-xl leading-tight text-white">
                  {ticket.event.title}
                </h2>
              </div>
            </div>

            <div className="grid gap-2 border-b-2 border-dashed border-black p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quando</span>
                <span className="font-bold">{formatDateTime(ticket.event.startsAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Onde</span>
                <span className="font-bold">
                  {ticket.event.venue} — {ticket.event.city}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titular</span>
                <span className="font-bold">{ticket.holderFirstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ticket.seatLabel ? 'Lugar' : 'Pista'}</span>
                <span className="rounded border-2 border-black bg-primary px-1.5 font-head">
                  {ticket.seatLabel ?? 'Pista'}
                </span>
              </div>
            </div>

            <CardContent className="flex flex-col items-center gap-3">
              <div
                className={`rounded border-2 border-black bg-white p-3 ${
                  ticket.status === 'VALID' ? '' : 'opacity-50 grayscale'
                }`}
              >
                <QRCodeSVG value={shareUrl} size={168} level="M" />
              </div>
              <code className="font-mono text-sm font-bold tracking-[0.15em]">{ticket.code}</code>
              <Badge
                tone={
                  ticket.status === 'VALID'
                    ? 'success'
                    : ticket.status === 'USED'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {ticket.status === 'VALID'
                  ? 'Válido — pronto para entrada'
                  : ticket.status === 'USED'
                    ? `Utilizado${ticket.checkedInAt ? ' em ' + formatDateTime(ticket.checkedInAt) : ''}`
                    : 'Cancelado'}
              </Badge>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({ title: 'Meu ingresso', url: shareUrl });
                } else {
                  void navigator.clipboard?.writeText(shareUrl);
                }
              }}
            >
              Compartilhar ingresso
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
