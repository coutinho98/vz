import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Copy, Check, Lock, MapPin, QrCode, Barcode, CreditCard, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { PayIntent, PayResponse, Reservation } from '../api/types';
import { api, apiErrorMessage, formatBRL } from '../api/client';
import { ErrorBox, Poster, Spinner } from '../components/ui';
import { HoldTimer } from '../components/HoldTimer';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Method = 'card' | 'pix' | 'boleto';

const METHODS: { id: Method; label: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Cartão', icon: CreditCard },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'boleto', label: 'Boleto', icon: Barcode },
];

export default function CheckoutPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: reservation, isPending, isError } = useQuery<Reservation>({
    queryKey: ['reservation', reservationId],
    queryFn: async () =>
      (await api.get<Reservation>(`/reservations/${reservationId}`)).data,
    refetchInterval: 15_000,
  });

  const [method, setMethod] = useState<Method>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const [copied, setCopied] = useState(false);

  // intent: codigo do pix / linha do boleto
  const [intent, setIntent] = useState<PayIntent | null>(null);

  const fetchIntent = useMutation({
    mutationFn: async (m: Method) => {
      const res = await api.post<PayIntent>(
        `/payments/reservations/${reservationId}/intent`,
        { method: m },
      );
      return res.data;
    },
    onSuccess: (data) => setIntent(data),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function selectMethod(m: Method) {
    setMethod(m);
    setError(null);
    setDeclined(false);
    setIntent(null);
    setCopied(false);
    if (m !== 'card' && reservation?.status === 'PENDING') {
      fetchIntent.mutate(m);
    }
  }

  const pay = useMutation({
    mutationFn: async () => {
      const body =
        method === 'card'
          ? { method, cardHolder, cardNumber, expiry, cvv }
          : { method };
      const res = await api.post<PayResponse>(
        `/payments/reservations/${reservationId}`,
        body,
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
  // breakdown da nota (mesma conta do backend: meia = preço/2 arredondado)
  const unitFull = Math.round(
    reservation.totalCents /
      (full + half * 0.5 || reservation.quantity),
  );
  const intFull = full * unitFull;
  const intHalf = reservation.totalCents - intFull;

  const start = new Date(reservation.event.startsAt);
  const dateLong = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(start)
    .replace('.', '');
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* header com passos do checkout */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              finalizando compra
            </p>
            <h1 className="font-head text-2xl tracking-tight sm:text-3xl">Checkout</h1>
          </div>
        </div>

        {/* stepper */}
        <div className="flex items-center gap-0">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center border-2 border-black bg-primary font-head text-xs shadow-sm">
              1
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wide">
              Reserva
            </span>
          </div>
          <span className="mx-3 h-0.5 flex-1 border-t-2 border-dashed border-black/40" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center border-2 border-black bg-primary font-head text-xs shadow-sm">
              2
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wide">
              Pagamento
            </span>
          </div>
          <span className="mx-3 hidden h-0.5 flex-1 border-t-2 border-dashed border-black/40 sm:block" aria-hidden />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex size-7 items-center justify-center border-2 border-dashed border-black/40 bg-card font-head text-xs text-muted-foreground">
              3
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Ingressos
            </span>
          </div>
        </div>

        <HoldTimer
          expiresAt={reservation.expiresAt}
          onExpire={() => {
            void queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
          }}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[3fr_4fr]">
        {/* resumo do pedido — sticky no desktop */}
        <div className="space-y-4 lg:sticky lg:top-20">
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
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  pedido #{reservation.id.slice(0, 8)}
                </p>
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
              </CardContent>
            </div>
          </Card>

          {/* nota fiscal do pedido */}
          <Card>
            <CardContent className="space-y-2.5 py-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                resumo do pedido
              </h3>

              <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                <span className="text-muted-foreground">
                  {full}× inteira{full === 1 ? '' : 's'}
                </span>
                <span>{formatBRL(intFull)}</span>
              </div>
              {half > 0 && (
                <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                  <span className="text-muted-foreground">
                    {half}× meia-entrada
                  </span>
                  <span>{formatBRL(intHalf)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                <span className="text-muted-foreground">taxa de serviço</span>
                <span className="font-bold text-green-700">grátis</span>
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2 border-t-2 border-dashed border-black/30 pt-2.5">
                <span className="font-head text-sm uppercase">Total</span>
                <span className="border-2 border-black bg-primary px-2.5 py-1 font-head text-xl shadow-sm">
                  {formatBRL(reservation.totalCents)}
                </span>
              </div>
              {half > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  meia-entrada: documento na portaria
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* pagamento */}
        <Card>
          <CardContent className="space-y-4">
            {/* seletor de meio de pagamento */}
            <div>
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Como você quer pagar?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectMethod(id)}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1.5 border-2 border-black px-2 py-2.5 font-head text-xs font-bold uppercase tracking-wide shadow-sm transition duration-200',
                      method === id
                        ? 'bg-primary'
                        : 'bg-card hover:-translate-y-0.5 hover:shadow',
                    )}
                    aria-pressed={method === id}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {method === 'card' && (
                <>
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
                  <p className="text-center font-mono text-xs leading-relaxed text-muted-foreground">
                    cartões de teste Stripe: 4242 4242 4242 4242 aprova ·
                    4000 0000 0000 0002 recusa
                  </p>
                </>
              )}

              {method === 'pix' && (
                <div className="space-y-3">
                  {fetchIntent.isPending || !intent?.pixCode ? (
                    <Spinner label="Gerando código Pix…" />
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-2 rounded border-2 border-dashed border-black/40 bg-muted/40 p-4">
                        <div className="rounded border-2 border-black bg-white p-2">
                          <QRCodeSVG value={intent.pixCode ?? ''} size={140} level="M" />
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          escaneie no app do banco
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pixcode">Pix copia e cola</Label>
                        <div className="flex gap-2">
                          <Input
                            id="pixcode"
                            readOnly
                            value={intent.pixCode}
                            className="min-w-0 flex-1 font-mono text-[11px]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Copiar código Pix"
                            className="shrink-0"
                            onClick={() => {
                              void navigator.clipboard?.writeText(intent.pixCode ?? '');
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                          >
                            {copied ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <Copy className="size-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                        simulação: clique abaixo como se o pagamento tivesse sido
                        confirmado pelo banco
                      </p>
                    </>
                  )}
                </div>
              )}

              {method === 'boleto' && (
                <div className="space-y-3">
                  {fetchIntent.isPending || !intent?.boletoFormatted ? (
                    <Spinner label="Gerando boleto…" />
                  ) : (
                    <>
                      <div className="flex items-center gap-3 rounded border-2 border-black bg-muted/60 p-3">
                        <Barcode className="size-10 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            linha digitável
                          </p>
                          <p className="break-all font-mono text-xs font-bold">
                            {intent.boletoFormatted}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard?.writeText(intent.boletoCode ?? '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? (
                          <>
                            <Check className="size-4" aria-hidden /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" aria-hidden /> Copiar linha digitável
                          </>
                        )}
                      </Button>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                        simulação: clique abaixo como se o boleto tivesse compensado
                      </p>
                    </>
                  )}
                </div>
              )}

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
                <Lock className="size-4" aria-hidden />
                {pay.isPending
                  ? 'Processando…'
                  : method === 'card'
                    ? `Pagar ${formatBRL(reservation.totalCents)}`
                    : method === 'pix'
                      ? 'Já paguei o Pix'
                      : 'Já paguei o boleto'}
              </Button>
              <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden />
                pagamento simulado · ambiente de teste
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
