import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CalendarDays,
  CreditCard,
  ScanLine,
  Ticket,
} from 'lucide-react';
import type { OrganizerStats, OrganizerStatsDay } from '../../api/types';
import { api, apiErrorMessage, formatBRL } from '../../api/client';
import { Badge, ErrorBox, Spinner } from '../../components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const METHOD_LABEL: Record<string, string> = {
  card: 'Cartão',
  pix: 'Pix',
  boleto: 'Boleto',
};

const METHOD_BG: Record<string, string> = {
  card: 'bg-[#c5d5ff]',
  pix: 'bg-primary',
  boleto: 'bg-muted',
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Banknote;
}) {
  return (
    <div className="rounded border-2 border-black bg-card p-4 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <span className="flex size-7 shrink-0 items-center justify-center border-2 border-black bg-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-head text-2xl tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border-2 border-black bg-card p-4 shadow-md">
      <h2 className="font-head text-lg tracking-tight">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function dayParts(date: string) {
  const [y, m, d] = date.split('-');
  return { y, m, d };
}

function SalesChart({ data, windowDays }: { data: OrganizerStatsDay[]; windowDays: number }) {
  const max = Math.max(...data.map((d) => d.revenueCents), 1);
  return (
    <div
      className="flex h-52 items-end gap-1.5"
      role="img"
      aria-label={`Receita por dia nos últimos ${windowDays} dias`}
    >
      {data.map((d, i) => {
        const { m, d: day } = dayParts(d.date);
        const pct = d.revenueCents > 0 ? Math.max((d.revenueCents / max) * 100, 8) : 0;
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex h-full flex-1 flex-col justify-end gap-1.5">
            <div
              className={`border-2 ${
                d.revenueCents > 0
                  ? 'border-black bg-primary'
                  : 'border-black/25 bg-muted/60'
              } ${isToday ? 'shadow-sm' : ''}`}
              style={{ height: `${pct}%`, minHeight: 4 }}
              title={`${day}/${m} — ${d.tickets} ingresso${d.tickets === 1 ? '' : 's'} · ${formatBRL(d.revenueCents)}`}
            />
            <span className="text-center font-mono text-[9px] text-muted-foreground">
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SplitBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; bg: string; note?: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-6 w-full overflow-hidden rounded border-2 border-black">
        {total > 0 ? (
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.key}
                className={`${s.bg} border-r-2 border-black last:border-r-0`}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${formatBRL(s.value)}`}
              />
            ))
        ) : (
          <div className="h-full w-full bg-muted/60" />
        )}
      </div>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-block size-3 border-2 border-black ${s.bg}`} aria-hidden />
            <span className="font-bold">{s.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {total > 0 ? `${Math.round((s.value / total) * 100)}% · ` : ''}
              {formatBRL(s.value)}
              {s.note ? ` · ${s.note}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatSessionDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export default function OrganizerAnalyticsPage() {
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [city, setCity] = useState('');

  const { data: stats, isPending, isError, error } = useQuery<OrganizerStats>({
    queryKey: ['organizer-stats', days, city],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (city) params.set('city', city);
      return (await api.get<OrganizerStats>(`/events/mine/stats?${params}`)).data;
    },
  });

  const cities = stats?.cities ?? [];
  const windowDays = stats?.windowDays ?? days;

  if (isPending) return <Spinner label="Carregando analytics…" />;
  if (isError || !stats) return <ErrorBox message={apiErrorMessage(error)} />;
  const totals = stats.totals ?? {
    eventsTotal: 0,
    eventsPublished: 0,
    ticketsSold: 0,
    revenueCents: 0,
    checkins: 0,
  };
  const salesByDay = stats.salesByDay ?? [];
  const eventsRanked = stats.eventsRanked ?? stats.topEvents ?? [];
  const paymentMethods = stats.paymentMethods ?? [];
  const ticketKinds = stats.ticketKinds ?? {
    full: 0,
    half: 0,
    fullRevenueCents: 0,
    halfRevenueCents: 0,
  };

  const bestDay = salesByDay.length
    ? salesByDay.reduce((best, d) => (d.revenueCents > best.revenueCents ? d : best), salesByDay[0])
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-head text-3xl tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe vendas, receita e ocupação dos seus eventos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border-2 border-black bg-card shadow-sm">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`cursor-pointer px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition ${
                  d === windowDays
                    ? 'bg-black text-background'
                    : 'text-muted-foreground hover:bg-muted'
                } ${d === 7 ? '' : 'border-l-2 border-black'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          {cities.length > 1 && (
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Filtrar por cidade"
              className="cursor-pointer border-2 border-black bg-card px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <option value="">Todas as cidades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {totals.eventsTotal === 0 ? (
        <div className="rounded border-2 border-dashed border-black/40 py-16 text-center text-muted-foreground">
          Crie e publique eventos para começar a ver métricas de vendas aqui.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Receita total"
              value={formatBRL(totals.revenueCents)}
              sub={`melhor dia: ${
                bestDay && bestDay.revenueCents > 0
                  ? `${dayParts(bestDay.date).d}/${dayParts(bestDay.date).m} · ${formatBRL(bestDay.revenueCents)}`
                  : '—'
              }`}
              icon={Banknote}
            />
            <KpiCard
              label="Ingressos vendidos"
              value={String(totals.ticketsSold)}
              sub={`${ticketKinds.full} inteira${ticketKinds.full === 1 ? '' : 's'} · ${ticketKinds.half} meia${ticketKinds.half === 1 ? '' : 's'}`}
              icon={Ticket}
            />
            <KpiCard
              label="Check-ins"
              value={String(totals.checkins)}
              sub={
                totals.ticketsSold > 0
                  ? `${Math.round((totals.checkins / totals.ticketsSold) * 100)}% dos ingressos`
                  : '—'
              }
              icon={ScanLine}
            />
            <KpiCard
              label="Eventos"
              value={String(totals.eventsPublished)}
              sub={`${totals.eventsTotal} ${city ? 'em ' + city : 'no total'}`}
              icon={CalendarDays}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel
                title="Vendas por dia"
                description={`Receita dos ingressos emitidos nos últimos ${windowDays} dias${city ? ` · ${city}` : ''}`}
              >
                <SalesChart data={salesByDay} windowDays={windowDays} />
              </Panel>
            </div>
            <Panel
              title="Formas de pagamento"
              description="Valor aprovado por método"
            >
              {paymentMethods.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Nenhum pagamento aprovado ainda
                </p>
              ) : (
                <SplitBar
                  segments={paymentMethods.map((p) => ({
                    key: p.method,
                    label: METHOD_LABEL[p.method] ?? p.method,
                    value: p.amountCents,
                    bg: METHOD_BG[p.method] ?? 'bg-muted',
                  }))}
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Desempenho por evento"
            description="Todas as sessões, ordenadas por receita"
          >
            <div className="max-h-[28rem] overflow-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Sessão</TableHead>
                    <TableHead>Vendidos</TableHead>
                    <TableHead className="w-56">Ocupação</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsRanked.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="font-bold">{e.title}</p>
                        {e.status !== 'PUBLISHED' && (
                          <Badge tone="zinc" className="mt-1">
                            {e.status === 'DRAFT' ? 'Não lançado' : 'Cancelado'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatSessionDateTime(e.startsAt)}
                      </TableCell>
                      <TableCell>
                        {e.sold}
                        <span className="text-muted-foreground"> / {e.capacity}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-full rounded border-2 border-black bg-muted/50">
                            <div
                              className={`h-full ${e.occupancyPct >= 80 ? 'bg-green-500' : e.occupancyPct >= 40 ? 'bg-primary' : 'bg-[#c5d5ff]'}`}
                              style={{ width: `${Math.min(e.occupancyPct, 100)}%` }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right font-mono text-xs">
                            {e.occupancyPct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatBRL(e.revenueCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel
            title="Tipo de ingresso"
            description="Receita por inteira e meia-entrada"
          >
            <SplitBar
              segments={[
                {
                  key: 'full',
                  label: 'Inteira',
                  value: ticketKinds.fullRevenueCents,
                  bg: 'bg-primary',
                  note: `${ticketKinds.full} ingresso${ticketKinds.full === 1 ? '' : 's'}`,
                },
                {
                  key: 'half',
                  label: 'Meia-entrada',
                  value: ticketKinds.halfRevenueCents,
                  bg: 'bg-[#c5d5ff]',
                  note: `${ticketKinds.half} ingresso${ticketKinds.half === 1 ? '' : 's'}`,
                },
              ]}
            />
          </Panel>
        </>
      )}

      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <CreditCard className="size-3" aria-hidden />
        Dados em tempo quase real — pagamentos simulados
      </p>
    </div>
  );
}
