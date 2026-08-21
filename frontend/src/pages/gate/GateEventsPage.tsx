import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Ticket, X, ChevronRight, CalendarCheck, Calendar, Clock } from 'lucide-react';
import type { EventItem } from '../../api/types';
import { api } from '../../api/client';
import { Badge, Poster, Spinner } from '../../components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type TimeFilter = 'all' | 'today' | 'upcoming' | 'past';
type CategoryFilter = 'all' | 'MOVIE' | 'SHOW';

function getTimeCategory(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();

  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isSameDay) return 'today';
  if (d.getTime() > now.getTime()) return 'upcoming';
  return 'past';
}

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return { label: `Hoje às ${time}`, isToday: true, time };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return { label: `Amanhã às ${time}`, isToday: false, time };
  }

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(d);

  return { label: `${formattedDate} às ${time}`, isToday: false, time };
}

export default function GateEventsPage() {
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const { data: events, isPending } = useQuery<EventItem[]>({
    queryKey: ['gate-events'],
    queryFn: async () => (await api.get<EventItem[]>('/gate/events')).data,
  });

  // Filtros aplicados
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      // Filtro de Categoria
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      // Filtro Temporal
      const cat = getTimeCategory(e.startsAt);
      if (timeFilter !== 'all' && cat !== timeFilter) return false;

      // Filtro de Busca
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchTitle = e.title.toLowerCase().includes(query);
        const matchVenue = e.venue.toLowerCase().includes(query);
        const matchCity = e.city.toLowerCase().includes(query);
        if (!matchTitle && !matchVenue && !matchCity) return false;
      }

      return true;
    });
  }, [events, search, timeFilter, categoryFilter]);

  // Contagens para os botões de filtro
  const counts = useMemo(() => {
    if (!events) return { today: 0, upcoming: 0, past: 0 };
    let today = 0;
    let upcoming = 0;
    let past = 0;
    for (const e of events) {
      const cat = getTimeCategory(e.startsAt);
      if (cat === 'today') today++;
      else if (cat === 'upcoming') upcoming++;
      else past++;
    }
    return { today, upcoming, past };
  }, [events]);

  // Agrupamentos por período
  const todayList = useMemo(
    () => filteredEvents.filter((e) => getTimeCategory(e.startsAt) === 'today'),
    [filteredEvents],
  );
  const upcomingList = useMemo(
    () => filteredEvents.filter((e) => getTimeCategory(e.startsAt) === 'upcoming'),
    [filteredEvents],
  );
  const pastList = useMemo(
    () => filteredEvents.filter((e) => getTimeCategory(e.startsAt) === 'past'),
    [filteredEvents],
  );

  const isFiltering = search.trim() !== '' || timeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-head text-3xl tracking-tight">Portaria</h1>
        <p className="mt-1 text-muted-foreground">
          Selecione a sessão para abrir a validação de ingressos na entrada.
        </p>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento, local ou cidade…"
              className="pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filtros de Categoria */}
          <div className="flex w-full sm:w-auto gap-1.5">
            <Button
              size="sm"
              className="flex-1 sm:flex-none font-bold"
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('all')}
            >
              Tudo
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none font-bold"
              variant={categoryFilter === 'MOVIE' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('MOVIE')}
            >
              Filmes
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none font-bold"
              variant={categoryFilter === 'SHOW' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('SHOW')}
            >
              Shows
            </Button>
          </div>
        </div>

        {/* Filtros Temporais com rolagem horizontal suave no mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 border-b border-black/10 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Button
            size="xs"
            variant={timeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('all')}
            className="shrink-0"
          >
            Todos ({events?.length ?? 0})
          </Button>
          <Button
            size="xs"
            variant={timeFilter === 'today' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('today')}
            className={`shrink-0 ${timeFilter === 'today' ? 'bg-green-300 text-black hover:bg-green-400' : ''}`}
          >
            Hoje ({counts.today})
          </Button>
          <Button
            size="xs"
            variant={timeFilter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('upcoming')}
            className="shrink-0"
          >
            Próximos ({counts.upcoming})
          </Button>
          <Button
            size="xs"
            variant={timeFilter === 'past' ? 'default' : 'outline'}
            onClick={() => setTimeFilter('past')}
            className="shrink-0"
          >
            Encerrados ({counts.past})
          </Button>

          {isFiltering && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTimeFilter('all');
                setCategoryFilter('all');
              }}
              className="ml-auto shrink-0 font-mono text-xs font-bold text-muted-foreground underline hover:text-foreground pl-2"
            >
              Limpar filtros ×
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isPending && <Spinner label="Carregando portaria…" />}

      {/* Estado Vazio Geral */}
      {events && events.length === 0 && (
        <div className="rounded border-2 border-dashed border-black/40 py-16 text-center text-muted-foreground">
          Nenhum evento publicado. Publique um evento primeiro.
        </div>
      )}

      {/* Estado Vazio de Busca */}
      {events && events.length > 0 && filteredEvents.length === 0 && (
        <div className="rounded border-2 border-dashed border-black/40 py-12 text-center text-muted-foreground">
          Nenhum evento encontrado para esta busca.
        </div>
      )}

      {/* Seções de Eventos */}
      <div className="space-y-8">
        {/* 1. Sessões de HOJE */}
        {(timeFilter === 'all' || timeFilter === 'today') && todayList.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-5 text-foreground" />
                <h2 className="font-head text-lg tracking-tight">Sessões de Hoje</h2>
                <Badge tone="success">
                  {todayList.length} {todayList.length === 1 ? 'sessão' : 'sessões'}
                </Badge>
              </div>
              <span className="font-mono text-xs uppercase font-bold text-muted-foreground">
                Prioridade de entrada
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {todayList.map((event) => (
                <GateEventCard key={event.id} event={event} isHighlighted />
              ))}
            </div>
          </section>
        )}

        {/* 2. Próximos Eventos */}
        {(timeFilter === 'all' || timeFilter === 'upcoming') && upcomingList.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-muted-foreground" />
                <h2 className="font-head text-lg tracking-tight">Próximos Eventos</h2>
                <Badge tone="outline">
                  {upcomingList.length} {upcomingList.length === 1 ? 'evento' : 'eventos'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingList.map((event) => (
                <GateEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Eventos Passados / Encerrados */}
        {(timeFilter === 'all' || timeFilter === 'past') && pastList.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black/30 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-muted-foreground" />
                <h2 className="font-head text-base text-muted-foreground tracking-tight">
                  Eventos Encerrados
                </h2>
                <span className="font-mono text-xs text-muted-foreground">({pastList.length})</span>
              </div>
            </div>

            <div className="grid gap-4 opacity-75 sm:grid-cols-2">
              {pastList.map((event) => (
                <GateEventCard key={event.id} event={event} isPast />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function GateEventCard({
  event,
  isHighlighted = false,
  isPast = false,
}: {
  event: EventItem;
  isHighlighted?: boolean;
  isPast?: boolean;
}) {
  const timeInfo = formatSessionDate(event.startsAt);
  const ticketsCount = event._count?.tickets ?? 0;

  return (
    <Link key={event.id} to={`/portaria/${event.id}`} className="group block h-full focus:outline-none">
      <Card
        className={`relative h-full overflow-hidden p-0 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-lg ${
          isHighlighted
            ? 'border-2 border-black bg-card shadow-sm'
            : isPast
              ? 'border-black/40 bg-muted/20'
              : 'border-2 border-black bg-card'
        }`}
      >
        <div className="flex h-full min-h-[160px] sm:min-h-[170px]">
          {/* Pôster lateral responsivo */}
          <div className="relative w-24 shrink-0 overflow-hidden border-r-2 border-dashed border-black sm:w-36">
            <Poster
              src={event.posterUrl}
              alt={event.title}
              genre={event.category === 'SHOW' ? 'ao vivo' : 'cinema'}
              className="h-full w-full object-cover"
            />
            {timeInfo.isToday && (
              <div className="absolute left-1 top-1 border border-black bg-green-300 px-1 py-0.5 font-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-green-950 shadow-sm sm:left-1.5 sm:top-1.5 sm:px-1.5">
                Hoje
              </div>
            )}
          </div>

          {/* Recortes semicirculares nas extremidades da divisória */}
          <span
            aria-hidden
            className="absolute left-24 top-0 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />
          <span
            aria-hidden
            className="absolute bottom-0 left-24 z-10 size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-black bg-background sm:left-36"
          />

          {/* Conteúdo do bilhete da portaria */}
          <CardContent className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
            <div className="space-y-1.5">
              {/* Badges e Horário */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <Badge tone={event.category === 'SHOW' ? 'default' : 'secondary'} className="text-[9px] sm:text-[10px]">
                  {event.category === 'SHOW' ? 'Show' : 'Filme'}
                </Badge>
                <Badge tone="outline" className="text-[9px] sm:text-[10px]">
                  {event.seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
                </Badge>
                {timeInfo.isToday ? (
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-green-700">
                    {timeInfo.label}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-muted-foreground">
                    {timeInfo.label}
                  </span>
                )}
              </div>

              {/* Título do Evento */}
              <h2 className="line-clamp-2 font-head text-sm sm:text-base lg:text-lg leading-snug group-hover:underline">
                {event.title}
              </h2>

              {/* Local e Cidade */}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {event.venue}{event.room ? ` (${event.room})` : ''} · {event.city}
                </span>
              </p>
            </div>

            {/* Rodapé Operacional */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-black/20 pt-2 font-mono text-xs">
              <span className="flex items-center gap-1 text-muted-foreground text-[11px] sm:text-xs">
                <Ticket className="size-3.5" />
                <strong className="text-foreground">{ticketsCount}</strong> vendidos
              </span>

              <span className="inline-flex items-center border border-black bg-primary px-2 sm:px-2.5 py-0.5 sm:py-1 font-head text-[11px] sm:text-xs font-bold text-primary-foreground shadow-xs transition-colors group-hover:bg-primary-hover">
                Validar <ChevronRight className="size-3.5 ml-0.5" />
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
