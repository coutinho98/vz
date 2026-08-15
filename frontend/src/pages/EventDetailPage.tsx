import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { EventItem, Reservation, SeatMap } from '../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge, ErrorBox, Poster, Spinner } from '../components/ui';
import SeatMapPicker from '../components/SeatMapPicker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event, isPending, isError } = useQuery<EventItem>({
    queryKey: ['event', id],
    queryFn: async () => (await api.get<EventItem>(`/events/${id}`)).data,
  });

  const isSeated = event?.seatingMode === 'SEATED';
  const { data: seatMap } = useQuery<SeatMap>({
    queryKey: ['seats', id],
    queryFn: async () => (await api.get<SeatMap>(`/events/${id}/seats`)).data,
    enabled: !!id && isSeated,
  });

  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const totalCents = useMemo(() => {
    if (!event) return 0;
    return isSeated ? selectedSeats.size * event.priceCents : quantity * event.priceCents;
  }, [event, isSeated, selectedSeats, quantity]);

  const reserve = useMutation({
    mutationFn: async () => {
      const body = isSeated ? { seatIds: [...selectedSeats] } : { quantity };
      const res = await api.post<Reservation>(`/reservations/events/${id}`, body);
      return res.data;
    },
    onSuccess: (reservation) => {
      navigate(`/checkout/${reservation.id}`);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function toggleSeat(seatId: string) {
    setError(null);
    setSelectedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else if (next.size < 8) next.add(seatId);
      return next;
    });
  }

  function handleReserve() {
    setError(null);
    if (isSeated && selectedSeats.size === 0) {
      setError('Selecione pelo menos um assento no mapa.');
      return;
    }
    if (!user) {
      navigate('/entrar', { state: { from: `/eventos/${id}` } });
      return;
    }
    if (user.role !== 'CUSTOMER') {
      setError('Apenas clientes podem reservar ingressos.');
      return;
    }
    reserve.mutate();
  }

  if (isPending) return <Spinner label="Carregando evento…" />;
  if (isError || !event)
    return (
      <div className="space-y-4">
        <ErrorBox message="Evento não encontrado." />
        <Button variant="outline" size="sm" render={<Link to="/" />}>
          ← Voltar para explorar
        </Button>
      </div>
    );

  const soldOut =
    event.availability !== undefined && event.availability.available <= 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <Card className="p-0">
          <div className="aspect-[2/3] md:aspect-auto md:h-full md:min-h-[320px]">
            <Poster src={event.posterUrl} alt={event.title} className="border-0" />
          </div>
        </Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
              {event.category === 'SHOW' ? 'Show' : 'Filme'}
            </Badge>
            <Badge tone="outline">
              {event.seatingMode === 'SEATED' ? 'Assentos marcados' : 'Pista'}
            </Badge>
            {event.organizer && <Badge tone="warning">por {event.organizer.name}</Badge>}
          </div>
          <h1 className="font-head text-3xl leading-tight tracking-tight">{event.title}</h1>
          <p className="text-sm leading-relaxed">{event.description}</p>
          <div className="grid gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Quando:</span>{' '}
              <strong>{formatDateTime(event.startsAt)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Onde:</span>{' '}
              <strong>
                {event.venue} — {event.city}
              </strong>
            </p>
            <p>
              <span className="text-muted-foreground">Preço:</span>{' '}
              <span className="rounded border-2 border-black bg-primary px-2 py-0.5 font-head">
                {formatBRL(event.priceCents)}
              </span>{' '}
              por ingresso
            </p>
            {event.availability && (
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {soldOut ? 'esgotado' : `${event.availability.available} de ${event.availability.total} disponíveis`}
              </p>
            )}
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-5">
          <h2 className="font-head text-lg">
            {isSeated ? 'Escolha seus assentos' : 'Escolha a quantidade'}
          </h2>

          {isSeated ? (
            seatMap ? (
              <SeatMapPicker
                seatMap={seatMap}
                selected={selectedSeats}
                onToggle={toggleSeat}
              />
            ) : (
              <Spinner label="Montando mapa…" />
            )
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Ingressos (máx. 10):</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </Button>
                <span className="w-10 text-center font-head text-lg">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          )}

          {error && <ErrorBox message={error} />}

          <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-dashed border-black/30 pt-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {isSeated
                  ? `${selectedSeats.size} assento(s) selecionado(s)`
                  : `${quantity} ingresso(s)`}
              </p>
              <p className="font-head text-2xl">{formatBRL(totalCents)}</p>
            </div>
            <Button
              size="lg"
              disabled={soldOut || reserve.isPending}
              onClick={handleReserve}
            >
              {reserve.isPending
                ? 'Reservando…'
                : soldOut
                  ? 'Esgotado'
                  : user
                    ? 'Reservar e pagar'
                    : 'Entrar para reservar'}
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            ⏱ A reserva fica bloqueada por 10 minutos até a confirmação do pagamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
