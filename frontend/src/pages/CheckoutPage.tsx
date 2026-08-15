import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PayResponse, Reservation } from '../api/types';
import { api, apiErrorMessage, formatBRL, formatDateTime } from '../api/client';
import { Badge, ErrorBox, Spinner } from '../components/ui';

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

  const input =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-amber-400';

  if (isPending) return <Spinner label="Carregando reserva…" />;
  if (isError || !reservation)
    return (
      <div className="space-y-4">
        <ErrorBox message="Reserva não encontrada. Veja suas reservas em Meus ingressos." />
        <Link to="/ingressos" className="text-sm text-amber-400 hover:underline">
          Ir para meus ingressos
        </Link>
      </div>
    );

  if (reservation.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-bold">Reserva expirada</h1>
        <p className="text-zinc-400">
          O tempo de bloqueio dos lugares terminou. Os lugares foram liberados — você
          pode iniciar uma nova reserva.
        </p>
        <Link
          to={`/eventos/${reservation.event.id}`}
          className="inline-block rounded-lg bg-amber-400 px-6 py-2.5 font-semibold text-zinc-950"
        >
          Ver evento
        </Link>
      </div>
    );
  }

  if (reservation.status === 'CONFIRMED') {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-bold text-emerald-400">Pagamento confirmado</h1>
        <p className="text-zinc-400">Esta reserva já foi paga. Seus ingressos estão prontos.</p>
        <Link
          to="/ingressos"
          className="inline-block rounded-lg bg-amber-400 px-6 py-2.5 font-semibold text-zinc-950"
        >
          Ver meus ingressos
        </Link>
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
        <h1 className="text-2xl font-bold tracking-tight">Pagamento</h1>
        <Badge tone={minutesLeft <= 2 ? 'red' : 'amber'}>
          Expira em {minutesLeft} min
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Resumo
          </h2>
          <p className="font-semibold">{reservation.event.title}</p>
          <p className="text-sm text-zinc-400">
            {formatDateTime(reservation.event.startsAt)}
          </p>
          <p className="text-sm text-zinc-400">
            {reservation.event.venue} — {reservation.event.city}
          </p>
          <p className="text-sm text-zinc-300">{seatsLabel}</p>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="text-sm text-zinc-400">Total</span>
            <span className="text-xl font-bold text-amber-400">
              {formatBRL(reservation.totalCents)}
            </span>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Cartão (simulado)
          </h2>
          <input
            className={input}
            placeholder="Nome impresso no cartão"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            required
          />
          <input
            className={input}
            placeholder="Número — use 0002 no fim p/ recusar"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className={input}
              placeholder="MM/AA"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
            />
            <input
              className={input}
              placeholder="CVV"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
          </div>

          {error && <ErrorBox message={error} />}
          {declined && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2.5 text-sm text-red-300">
              <strong>Pagamento recusado.</strong> Tente outro cartão — a reserva
              continua válida até a expiração.
            </div>
          )}

          <button
            disabled={pay.isPending}
            className="w-full rounded-lg bg-amber-400 py-2.5 font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {pay.isPending ? 'Processando…' : `Pagar ${formatBRL(reservation.totalCents)}`}
          </button>
          <p className="text-center text-xs text-zinc-500">
            Ambiente de teste: qualquer cartão é aprovado, exceto números terminados
            em 0002.
          </p>
        </form>
      </div>
    </div>
  );
}
