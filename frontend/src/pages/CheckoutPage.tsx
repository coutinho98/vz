import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PayResponse, Reservation } from '../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../api/client';
import { Badge, ErrorBox, Spinner } from '../components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
            O tempo de bloqueio dos lugares terminou e eles foram liberados — você pode
            iniciar uma nova reserva.
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <Button render={<Link to={`/eventos/${reservation.event.id}`} />}>
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
          <Button render={<Link to="/ingressos" />}>Ver meus ingressos</Button>
        </div>
      </div>
    );
  }

  const seatsLabel = reservation.seats?.length
    ? reservation.seats.map((s) => `${s.row}${s.number}`).join(', ')
    : `${reservation.quantity} ingresso(s) pista`;

  const minutesLeft = Math.max(
    0,
    Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 60000),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-head text-2xl tracking-tight">Pagamento</h1>
        <Badge tone={minutesLeft <= 2 ? 'red' : 'warning'}>
          ⏱ expira em {minutesLeft} min
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>{reservation.event.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{formatDateTime(reservation.event.startsAt)}</p>
            <p className="text-muted-foreground">
              {reservation.event.venue} — {reservation.event.city}
            </p>
            <p className="rounded border-2 border-black bg-muted px-2 py-1 font-mono text-xs uppercase tracking-wide">
              {seatsLabel}
            </p>
            <div className="flex items-center justify-between border-t-2 border-dashed border-black/30 pt-3">
              <span className="text-muted-foreground">Total</span>
              <span className="rounded border-2 border-black bg-primary px-2 py-0.5 font-head text-lg">
                {formatBRL(reservation.totalCents)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-head text-sm uppercase tracking-widest text-muted-foreground">
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
                <Label htmlFor="number">Número — use 0002 no fim p/ recusar</Label>
                <Input
                  id="number"
                  className="font-mono"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
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
                  <AlertTitle>Pagamento recusado</AlertTitle>
                  <AlertDescription>
                    Tente outro cartão — a reserva continua válida até a expiração.
                  </AlertDescription>
                </Alert>
              )}

              <Button disabled={pay.isPending} className="w-full" size="lg">
                {pay.isPending
                  ? 'Processando…'
                  : `Pagar ${formatBRL(reservation.totalCents)}`}
              </Button>
              <p className="text-center font-mono text-xs text-muted-foreground">
                teste: qualquer cartão aprova, exceto terminado em 0002
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
