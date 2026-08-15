import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { EventItem, Reservation, SeatMap } from '../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge, ErrorBox, Poster, Spinner } from '../components/ui';
import SeatMapPicker from '../components/SeatMapPicker';

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
      const res = await api.post<Reservation>(
        `/reservations/events/${id}`,
        body,
      );
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
        <Link to="/" className="text-sm text-amber-400 hover:underline">
          ← Voltar para explorar
        </Link>
      </div>
    );

  const soldOut =
    event.availability !== undefined && event.availability.available <= 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <div className="aspect-[2/3] md:aspect-auto md:h-full md:min-h-[320px]">
            <Poster src={event.posterUrl} alt={event.title} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={event.category === 'SHOW' ? 'amber' : 'zinc'}>
              {event.category === 'SHOW' ? 'Show' : 'Filme'}
            </Badge>
            <Badge>{event.seatingMode === 'SEATED' ? 'Assentos marcados' : 'Pista'}</Badge>
            {event.organizer && <Badge>por {event.organizer.name}</Badge>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-sm leading-relaxed text-zinc-300">{event.description}</p>
          <div className="grid gap-2 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-500">Quando:</span> {formatDateTime(event.startsAt)}
            </p>
            <p>
              <span className="text-zinc-500">Onde:</span> {event.venue} — {event.city}
            </p>
            <p>
              <span className="text-zinc-500">Preço:</span>{' '}
              <span className="font-semibold text-amber-400">
                {formatBRL(event.priceCents)}
              </span>{' '}
              por ingresso
            </p>
            {event.availability && (
              <p>
                <span className="text-zinc-500">Disponíveis:</span>{' '}
                {soldOut ? 'esgotado' : event.availability.available} de{' '}
                {event.availability.total}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="mb-5 text-lg font-semibold">
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
            <span className="text-sm text-zinc-400">Ingressos (máx. 10):</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-9 w-9 rounded-lg border border-zinc-700 text-lg font-bold text-zinc-300 transition hover:border-amber-400"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="h-9 w-9 rounded-lg border border-zinc-700 text-lg font-bold text-zinc-300 transition hover:border-amber-400"
              >
                +
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mt-6 flex flex-col items-stretch justify-between gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-zinc-500">
              {isSeated
                ? `${selectedSeats.size} assento(s) selecionado(s)`
                : `${quantity} ingresso(s)`}
            </p>
            <p className="text-2xl font-bold text-amber-400">{formatBRL(totalCents)}</p>
          </div>
          <button
            onClick={handleReserve}
            disabled={soldOut || reserve.isPending}
            className="rounded-xl bg-amber-400 px-8 py-3 font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-40"
          >
            {reserve.isPending
              ? 'Reservando…'
              : soldOut
                ? 'Esgotado'
                : user
                  ? 'Reservar e ir para o pagamento'
                  : 'Entrar para reservar'}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          A reserva fica bloqueada por 10 minutos até a confirmação do pagamento.
        </p>
      </section>
    </div>
  );
}
