import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarDays, MapPin, Timer } from 'lucide-react';
import type { EventItem, Reservation, SeatMap } from '../api/types';
import { api, apiErrorMessage, formatBRL } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge, ErrorBox, Poster, Spinner } from '../components/ui';
import SeatMapPicker from '../components/SeatMapPicker';
import { TrailerPlayer } from '../components/TrailerPlayer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const FALLBACK_TRAILERS: Record<string, string> = {
  'tmdb-969681': 'JfVOs4VSpmA', // Homem-Aranha
  'tmdb-1481343': '73_1biulkYk', // A Boca do Diabo
  'tmdb-872585': 'uYPbbksJxIg', // Oppenheimer
  'movie-oppenheimer': 'uYPbbksJxIg',
  'movie-duna2': 'Way9Dexny3w',
  'movie-parasita': '5xH0R_gx3Dc',
  'movie-interstellar': 'zSWdZVtXT7E',
  'movie-cidade-de-deus': 'dcUOO4Itgmw',
  'movie-tudo-em-todo-lugar': 'wxN1T1uxQ2g',
  'show-coldplay': 'V3ZhpFXzL1g',
  'show-orquestra': 'Q_k8QZ7x5j4',
  'show-alok': 'sW8YtF7Gk1U',
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const { data: event, isPending, isError } = useQuery<EventItem>({
    queryKey: ['event', id],
    queryFn: async () => (await api.get<EventItem>(`/events/${id}`)).data,
  });

  const isSeated = event?.seatingMode === 'SEATED';
  const { data: seatMap } = useQuery<SeatMap>({
    queryKey: ['seats', id],
    queryFn: async () => (await api.get<SeatMap>(`/events/${id}/seats`)).data,
    enabled: !!id && isSeated,
    refetchInterval: 10_000,
  });

  const { data: trailer } = useQuery<{ youtubeKey: string | null; title: string | null }>({
    queryKey: ['trailer', event?.catalogRef, event?.title],
    queryFn: async () => {
      if (!event) return { youtubeKey: null, title: null };
      const params = new URLSearchParams();
      if (event.catalogRef) params.set('ref', event.catalogRef);
      if (event.title) params.set('title', event.title);
      const res = await api.get<{ youtubeKey: string | null; title: string | null }>(
        `/catalog/trailer?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!event,
    staleTime: 1000 * 60 * 60,
  });

  const youtubeKey =
    event?.trailer?.youtubeKey ||
    trailer?.youtubeKey ||
    (event?.catalogRef ? FALLBACK_TRAILERS[event.catalogRef] : null) ||
    (event?.title?.toLowerCase().includes('homem-aranha') ? 'JfVOs4VSpmA' : null) ||
    (event?.title?.toLowerCase().includes('boca do diabo') ? '73_1biulkYk' : null) ||
    (event?.title?.toLowerCase().includes('oppenheimer') ? 'uYPbbksJxIg' : null);

  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [halfCount, setHalfCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // atualiza mapa de assentos via SSE
  useEffect(() => {
    if (!id || !isSeated) return;
    const source = new EventSource(`${API_BASE}/events/${id}/seats/stream`);
    source.onmessage = (message) => {
      if (message.data.includes('seats-updated')) {
        void queryClient.invalidateQueries({ queryKey: ['seats', id] });
        void queryClient.invalidateQueries({ queryKey: ['event', id] });
      }
    };
    return () => source.close();
  }, [id, isSeated, queryClient]);

  const ticketCount = isSeated ? selectedSeats.size : quantity;
  const effectiveHalf = Math.min(halfCount, ticketCount);
  const totalCents = useMemo(() => {
    if (!event) return 0;
    const full = ticketCount - effectiveHalf;
    return (
      full * event.priceCents + effectiveHalf * Math.round(event.priceCents / 2)
    );
  }, [event, ticketCount, effectiveHalf]);

  useEffect(() => {
    setHalfCount((h) => Math.min(h, isSeated ? selectedSeats.size : quantity));
  }, [isSeated, selectedSeats, quantity]);

  const reserve = useMutation({
    mutationFn: async () => {
      const body = isSeated
        ? { seatIds: [...selectedSeats], halfCount: effectiveHalf }
        : { quantity, halfCount: effectiveHalf };
      const res = await api.post<Reservation>(`/reservations/events/${id}`, body);
      return res.data;
    },
    onSuccess: (reservation) => {
      navigate(`/checkout/${reservation.id}`);
    },
    onError: (err) => {
      setError(apiErrorMessage(err));
      // se tomou 409 (alguém pegou antes), limpa seleção e atualiza mapa
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['seats', id] });
        setSelectedSeats(new Set());
      }
    },
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
        <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/" />}>
          ← Voltar para explorar
        </Button>
      </div>
    );

  const soldOut =
    event.availability !== undefined && event.availability.available <= 0;

  const start = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(start);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(start)
    .replace('.', '')
    .toUpperCase();
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(start);
  const dateLong = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(start);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);
  const availablePct =
    event.availability && event.availability.total > 0
      ? (event.availability.available / event.availability.total) * 100
      : 0;

  return (
    <div className="space-y-8">
      <section>
        <Card className="relative p-0">
          <div className="flex flex-col sm:flex-row">
            <div
              className={`relative shrink-0 overflow-hidden border-b-2 border-dashed border-black sm:w-52 sm:border-b-0 sm:border-r-2 ${
                soldOut ? 'grayscale' : ''
              }`}
            >
              <div className="aspect-[3/4] sm:aspect-auto sm:h-full sm:w-full">
                <Poster src={event.posterUrl} alt={event.title} className="border-0" />
              </div>

              <div className="absolute left-2 top-2 flex size-12 flex-col items-center justify-center border-2 border-black bg-primary text-primary-foreground shadow-sm">
                <span className="font-head text-lg leading-none">{day}</span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
                  {month}
                </span>
              </div>

              {soldOut && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rotate-[-6deg] border-2 border-black bg-destructive px-3 py-1 font-head text-xs uppercase tracking-widest text-destructive-foreground shadow-md">
                    Esgotado
                  </span>
                </div>
              )}
            </div>

            <span
              aria-hidden
              className="absolute left-52 top-0 z-10 hidden size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-background sm:block"
            />
            <span
              aria-hidden
              className="absolute bottom-0 left-52 z-10 hidden size-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-black bg-background sm:block"
            />

            <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'}>
                  {event.category === 'SHOW' ? 'Show' : 'Filme'}
                </Badge>
                <Badge tone="outline">
                  {event.seatingMode === 'SEATED' ? 'Assentos marcados' : 'Pista'}
                </Badge>
                <Badge tone="default" className="border-2 border-black bg-primary font-mono font-bold text-foreground">
                  {event.room ?? (event.category === 'MOVIE' ? 'Sala 1' : 'Palco Principal')}
                </Badge>
              </div>

              <h1 className="font-head text-2xl leading-tight tracking-tight sm:text-3xl">
                {event.title}
              </h1>
              <p className="text-sm leading-relaxed">{event.description}</p>

              <div className="mt-1 space-y-2.5 border-t-2 border-dashed border-black/25 pt-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border-2 border-black bg-accent shadow-xs">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    {event.sessionCount && event.sessionCount > 1 ? (
                      <>
                        <p className="text-sm">
                          <strong>Em cartaz</strong> - escolha a sessão:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {event.sessions?.map((s) => {
                            const active = s.id === id;
                            return (
                              <Link
                                key={s.id}
                                to={`/eventos/${s.id}`}
                                className={`inline-flex items-center gap-1.5 border-2 border-black px-2.5 py-1 font-mono text-xs font-bold shadow-sm transition ${
                                  active
                                    ? 'bg-primary'
                                    : 'bg-card hover:-translate-y-0.5 hover:shadow'
                                }`}
                              >
                                <span>
                                  {new Intl.DateTimeFormat('pt-BR', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                    .format(new Date(s.startsAt))
                                    .replace(/\./g, '')}
                                </span>
                                {s.room && (
                                  <span className="border-l border-black/30 pl-1 text-[10px] text-muted-foreground font-semibold">
                                    {s.room}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="pt-1 text-sm">
                        <span className="capitalize">{weekday}</span>, {dateLong} ·{' '}
                        <strong>{time}</strong>
                        {event.room && (
                          <span className="ml-2 font-mono font-bold text-foreground">
                            · {event.room}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border-2 border-black bg-accent shadow-xs">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <p className="pt-1 text-sm">
                    <strong>{event.venue}</strong>
                    <span className="ml-1.5 rounded-xs border border-black bg-primary/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                      {event.room ?? (event.category === 'MOVIE' ? 'Sala 1' : 'Palco Principal')}
                    </span>
                    {' · '}{event.city}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t-2 border-dashed border-black/25 pt-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="border-2 border-black bg-primary px-2.5 py-1 font-head text-xl shadow-sm">
                    {formatBRL(event.priceCents)}
                  </span>
                  <span className="text-xs text-muted-foreground">por ingresso</span>
                  <TrailerPlayer youtubeKey={youtubeKey} title={event.title} />
                </div>
                {event.availability && (
                  <div className="w-full max-w-56 space-y-1 sm:w-48">
                    <div className="h-2.5 w-full border-2 border-black">
                      <div
                        className={`h-full ${soldOut ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${soldOut ? 100 : Math.max(availablePct, 4)}%` }}
                      />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      {soldOut
                        ? 'Esgotado'
                        : `${event.availability.available} de ${event.availability.total} disponíveis`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      </section>

      {user && user.role !== 'CUSTOMER' ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-head text-base">
              Compra de ingressos é exclusiva de contas de cliente
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Você está logado como{' '}
              <strong>{user.role === 'GATE' ? 'Portaria' : 'Organizador'}</strong>.
              Esta conta valida ingressos na entrada
              {user.role === 'ORGANIZER' && ' e gerencia eventos'}. Para comprar,
              entre com uma conta de cliente.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate('/entrar', { state: { from: `/eventos/${id}` } });
              }}
            >
              Trocar para conta de cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-head text-lg">
                {isSeated ? 'Escolha seus assentos' : 'Escolha a quantidade'}
              </h2>
              {event.room && (
                <span className="rounded border-2 border-black bg-primary px-2.5 py-0.5 font-mono text-xs font-bold text-foreground shadow-xs">
                  {event.room}
                </span>
              )}
            </div>

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

          {ticketCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border-2 border-dashed border-black/40 bg-muted/40 px-3 py-2.5">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wide">
                  Meias-entradas
                </p>
                <p className="text-xs text-muted-foreground">
                  estudante · 60+ · PCD — documento verificado na portaria
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Menos meia-entrada"
                  onClick={() => setHalfCount((h) => Math.max(0, h - 1))}
                >
                  −
                </Button>
                <span className="w-8 text-center font-head text-lg">
                  {effectiveHalf}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Mais meia-entrada"
                  disabled={effectiveHalf >= ticketCount}
                  onClick={() => setHalfCount((h) => Math.min(ticketCount, h + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-stretch justify-between gap-4 border-t-2 border-dashed border-black/30 pt-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {ticketCount} ingresso(s)
                {effectiveHalf > 0 &&
                  ` · ${ticketCount - effectiveHalf} inteira(s) + ${effectiveHalf} meia(s)`}
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
          <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Timer className="size-3.5" aria-hidden />
            A reserva fica bloqueada por 10 minutos até a confirmação do pagamento.
          </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
