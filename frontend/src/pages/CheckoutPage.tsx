import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin } from 'lucide-react';
import type { PayResponse, Reservation } from '../api/types';
import { api, apiErrorMessage, formatBRL } from '../api/client';
import { ErrorBox, Poster, Spinner } from '../components/ui';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CheckoutPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const { data: reservation, isPending, isError } = useQuery<Reservation>({
    queryKey: ['reservation', reservationId],
    queryFn: async () =>
      (await api.get<Reservation>(`/reservations/${reservationId}`)).data,
    refetchInterval: 15_000,
  });

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const pay = useMutation({
    mutationFn: async () => {
      const res = await api.post<PayResponse>(
        `/payments/reservations/${reservationId}`,
        { cardHolder, cardNumber, expiry, cvv },
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data.outcome === 'APPROVED' && data.tickets[0]) {
        navigate('/ingressos', {
          state: { highlight: data.tickets.map((t) => t.code) },
        });
      } else {
        setDeclined(true);
      }
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDeclined(false);
    pay.mutate();
  }

  if (isPending) return <Spinner label="Carregando reserva…" />;
  if (isError || !reservation)
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ErrorBox message="Reserva não encontrada. Veja seus ingressos." />
        <Link to="/ingressos" className="block text-center text-sm font-bold underline underline-offset-4">
          Ir para meus ingressos
        </Link>
      </div>
    );

  if (reservation.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-lg">
        <Alert status="warning">
          <AlertTitle>Reserva expirada</AlertTitle>
          <AlertDescription>
            O tempo de bloqueio dos lugares terminou e eles foram liberados. Você pode
            iniciar uma nova reserva.
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <Button nativeButton={false} render={<Link to={`/eventos/${reservation.event.id}`} />}>
            Ver evento novamente
          </Button>
        </div>
      </div>
    );
  }

  if (reservation.status === 'CONFIRMED') {
    return (
      <div className="mx-auto max-w-lg">
        <Alert status="success">
          <AlertTitle>Pagamento confirmado</AlertTitle>
          <AlertDescription>
            Esta reserva já foi paga. Seus ingressos estão prontos.
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <Button nativeButton={false} render={<Link to="/ingressos" />}>Ver meus ingressos</Button>
        </div>
      </div>
    );
  }

  const seatsLabel = reservation.seats?.length
    ? reservation.seats.map((s) => `${s.row}${s.number}`).join(' · ')
    : `${reservation.quantity} ingresso(s) pista`;

  const half = reservation.halfCount ?? 0;
  const full = reservation.quantity - half;

  const minutesLeft = Math.max(
    0,
    Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 60000),
  );
  const urgent = minutesLeft <= 2;

  const start = new Date(reservation.event.startsAt);
  const dateLong = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(start)
    .replace('.', '');
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-head text-2xl tracking-tight">Pagamento</h1>
        <span
          className={`flex items-center gap-2 border-2 border-black px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest shadow-sm ${
            urgent ? 'animate-pulse bg-destructive text-destructive-foreground' : 'bg-primary'
          }`}
        >
          <span className="size-2 rounded-full border border-current bg-background" aria-hidden />
          expira em {minutesLeft} min
        </span>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <Card className="relative p-0">
          <div className="flex">
            <div className="w-20 shrink-0 overflow-hidden border-r-2 border-dashed border-black sm:w-24">
              <Poster
                src={reservation.event.posterUrl}
                alt={reservation.event.title}
                className="h-full border-0"
              />
            </div>

            <span
              aria-hidden
              className="absolute left-20 top-0 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-24"
            />
            <span
              aria-hidden
              className="absolute bottom-0 left-20 z-10 size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-24"
            />

            <CardContent className="flex min-w-0 flex-1 flex-col gap-2 py-3">
              <h2 className="font-head text-base leading-snug">
                {reservation.event.title}
              </h2>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {dateLong} · <strong className="text-foreground">{time}</strong>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {reservation.event.venue} · {reservation.event.city}
                  </span>
                </p>
              </div>
              <p className="w-fit border-2 border-black bg-muted px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide">
                {seatsLabel}
              </p>
              {half > 0 && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  {full} inteira(s) + {half} meia-entrada(s) · documento na portaria
                </p>
              )}
              <div className="mt-auto flex items-end justify-between gap-2 border-t-2 border-dashed border-black/25 pt-2">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="border-2 border-black bg-primary px-2 py-0.5 font-head text-lg shadow-sm">
                  {formatBRL(reservation.totalCents)}
                </span>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="h-2 w-2 border-2 border-black bg-primary" aria-hidden />
                Cartão (simulado)
              </h2>
              <div className="space-y-1.5">
                <Label htmlFor="holder">Nome impresso no cartão</Label>
                <Input
                  id="holder"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="number">Número do cartão</Label>
                <Input
                  id="number"
                  className="font-mono"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
                  placeholder="4242 4242 4242 4242"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry">Validade (MM/AA)</Label>
                  <Input
                    id="expiry"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                </div>
              </div>

              {error && <ErrorBox message={error} />}
              {declined && (
                <Alert status="error">
                  <AlertTitle>
                    Pagamento recusado{pay.data?.declineCode ? ` · ${pay.data.declineCode}` : ''}
                  </AlertTitle>
                  <AlertDescription>
                    {pay.data?.declineMessage ??
                      'Tente outro cartão. A reserva continua válida até a expiração.'}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={pay.isPending} className="w-full" size="lg">
                {pay.isPending
                  ? 'Processando…'
                  : `Pagar ${formatBRL(reservation.totalCents)}`}
              </Button>
              <p className="text-center font-mono text-xs leading-relaxed text-muted-foreground">
                cartões de teste Stripe: 4242 4242 4242 4242 aprova ·
                4000 0000 0000 0002 recusa
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
