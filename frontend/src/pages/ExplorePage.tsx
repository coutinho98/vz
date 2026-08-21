import { useState, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import type { EventsPage, EventItem } from '../api/types';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { ErrorBox, Spinner } from '../components/ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type TimeframeOption = 'all' | 'today' | 'weekend' | 'week' | 'month';
type PriceRangeOption = '' | 'under30' | '30to60' | 'over60';
type SortOption = 'date_asc' | 'price_asc' | 'price_desc' | 'title_asc';

function isEventToday(event: EventItem) {
  const now = new Date();
  const todayStr = now.toDateString();
  const eventDateStr = new Date(event.startsAt).toDateString();
  if (eventDateStr === todayStr) return true;
  if (event.sessions && event.sessions.some((s) => new Date(s.startsAt).toDateString() === todayStr)) {
    return true;
  }
  return false;
}

function isEventWeekend(event: EventItem) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentDay = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const daysUntilFriday = (5 - currentDay + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + (currentDay === 0 || currentDay === 6 ? 0 : daysUntilFriday));
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  const daysUntilSunday = (7 - friday.getDay()) % 7;
  sunday.setDate(friday.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday));
  sunday.setHours(23, 59, 59, 999);

  const check = (dateIso: string) => {
    const d = new Date(dateIso);
    return d >= now && d <= sunday;
  };

  if (check(event.startsAt)) return true;
  if (event.sessions && event.sessions.some((s) => check(s.startsAt))) return true;
  return false;
}

function isEventInDays(event: EventItem, days: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(now.getDate() + days);
  future.setHours(23, 59, 59, 999);

  const check = (dateIso: string) => {
    const d = new Date(dateIso);
    return d >= now && d <= future;
  };

  if (check(event.startsAt)) return true;
  if (event.sessions && event.sessions.some((s) => check(s.startsAt))) return true;
  return false;
}

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | 'MOVIE' | 'SHOW'>('');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [city, setCity] = useState('');
  const [seatingMode, setSeatingMode] = useState<'' | 'SEATED' | 'STANDING'>('');
  const [priceRange, setPriceRange] = useState<PriceRangeOption>('');
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [page, setPage] = useState(1);

  // Mapeia faixa de preço selecionada para centavos
  const priceFilterParams = useMemo(() => {
    if (priceRange === 'under30') return { maxPriceCents: 3000 };
    if (priceRange === '30to60') return { minPriceCents: 3000, maxPriceCents: 6000 };
    if (priceRange === 'over60') return { minPriceCents: 6000 };
    return {};
  }, [priceRange]);

  const { data, isPending, isError } = useQuery<EventsPage>({
    queryKey: [
      'events',
      { search, category, timeframe, city, seatingMode, priceRange, sortBy, page },
    ],
    queryFn: async ({ signal }) => {
      const res = await api.get<EventsPage>('/events', {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(category ? { category } : {}),
          ...(timeframe !== 'all' ? { timeframe } : {}),
          ...(city ? { city } : {}),
          ...(seatingMode ? { seatingMode } : {}),
          ...(sortBy !== 'date_asc' ? { sortBy } : {}),
          ...priceFilterParams,
          page,
        },
        signal,
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const rawItems = data?.items ?? [];

  // Filtro e ordenação imediatos no cliente
  const filteredItems = useMemo(() => {
    let list = rawItems;

    // 1. Filtro de Texto
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    // 2. Filtro de Categoria
    if (category) {
      list = list.filter((e) => e.category === category);
    }

    // 3. Filtro Temporal
    if (timeframe === 'today') {
      list = list.filter(isEventToday);
    } else if (timeframe === 'weekend') {
      list = list.filter(isEventWeekend);
    } else if (timeframe === 'week') {
      list = list.filter((e) => isEventInDays(e, 7));
    } else if (timeframe === 'month') {
      list = list.filter((e) => isEventInDays(e, 30));
    }

    // 4. Filtro de Cidade
    if (city) {
      list = list.filter((e) => e.city.toLowerCase() === city.toLowerCase());
    }

    // 5. Filtro de Formato
    if (seatingMode) {
      list = list.filter((e) => e.seatingMode === seatingMode);
    }

    // 6. Filtro de Preço
    if (priceRange === 'under30') {
      list = list.filter((e) => e.priceCents <= 3000);
    } else if (priceRange === '30to60') {
      list = list.filter((e) => e.priceCents >= 3000 && e.priceCents <= 6000);
    } else if (priceRange === 'over60') {
      list = list.filter((e) => e.priceCents > 6000);
    }

    // 7. Ordenação
    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.priceCents - b.priceCents);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.priceCents - a.priceCents);
    } else if (sortBy === 'title_asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }

    return sorted;
  }, [rawItems, search, category, timeframe, city, seatingMode, priceRange, sortBy]);

  // Lista de cidades disponíveis
  const availableCities = useMemo(() => {
    if (data?.availableCities && data.availableCities.length > 0) {
      return data.availableCities;
    }
    const set = new Set<string>();
    rawItems.forEach((i) => {
      if (i.city) set.add(i.city);
    });
    return Array.from(set).sort();
  }, [data?.availableCities, rawItems]);

  // Contagem de filtros ativos
  const activeFiltersCount =
    (category ? 1 : 0) +
    (timeframe !== 'all' ? 1 : 0) +
    (city ? 1 : 0) +
    (seatingMode ? 1 : 0) +
    (priceRange ? 1 : 0) +
    (sortBy !== 'date_asc' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function clearAllFilters() {
    setSearch('');
    setCategory('');
    setTimeframe('all');
    setCity('');
    setSeatingMode('');
    setPriceRange('');
    setSortBy('date_asc');
    setPage(1);
  }

  const timeframeLabels: Record<TimeframeOption, string> = {
    all: 'Todas as datas',
    today: 'Hoje',
    weekend: 'Fim de semana',
    week: 'Próximos 7 dias',
    month: 'Próximos 30 dias',
  };

  const sortLabels: Record<SortOption, string> = {
    date_asc: 'Mais próximos',
    price_asc: 'Menor preço',
    price_desc: 'Maior preço',
    title_asc: 'Nome (A-Z)',
  };

  return (
    <div className="w-full max-w-full space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div className="space-y-1">
          <h1 className="font-head text-2xl sm:text-3xl tracking-tight">Grandes Eventos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Filmes em exibição, shows ao vivo e experiências.
          </p>
        </div>

        {data && (
          <p className="font-mono text-xs text-muted-foreground">
            <strong className="text-foreground">{filteredItems.length}</strong>{' '}
            {filteredItems.length === 1 ? 'evento' : 'eventos'}
          </p>
        )}
      </div>

      {/* Barra de Busca e Categorias Principais */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar filme, show, local ou cidade…"
              className="pl-9 pr-8 font-sans text-xs sm:text-sm"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Alternador de Categoria e Botão de Filtros */}
          <div className="flex w-full sm:w-auto items-center gap-2">
            {/* Segmented control para categorias */}
            <div className="flex flex-1 sm:flex-none border-2 border-black bg-card shadow-xs">
              {[
                { value: '', label: 'Tudo' },
                { value: 'MOVIE', label: 'Filmes' },
                { value: 'SHOW', label: 'Shows' },
              ].map((f, idx) => (
                <button
                  key={f.value}
                  type="button"
                  className={`flex-1 sm:w-20 cursor-pointer py-1.5 font-head text-[11px] sm:text-xs uppercase tracking-tight text-center transition ${
                    category === f.value
                      ? 'bg-black text-white font-bold'
                      : 'bg-card text-foreground hover:bg-accent'
                  } ${idx > 0 ? 'border-l-2 border-black' : ''}`}
                  onClick={() => {
                    setCategory(f.value as '' | 'MOVIE' | 'SHOW');
                    setPage(1);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Botão de Abrir Filtros Avançados */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className={`shrink-0 cursor-pointer border-2 border-black px-3 py-1.5 font-head text-[11px] sm:text-xs uppercase tracking-tight transition shadow-xs active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 ${
                showAdvanced || activeFiltersCount > 0
                  ? 'bg-primary text-black font-bold'
                  : 'bg-card text-foreground hover:bg-accent'
              }`}
            >
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-black font-mono text-[9px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos de Data */}
        <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {(['all', 'today', 'weekend', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`shrink-0 cursor-pointer border-2 border-black px-2.5 sm:px-3 py-1 font-head text-[11px] sm:text-xs uppercase tracking-wide transition shadow-xs active:translate-x-0.5 active:translate-y-0.5 ${
                timeframe === t
                  ? 'bg-black text-white font-bold'
                  : 'bg-card text-foreground hover:bg-accent'
              }`}
              onClick={() => {
                setTimeframe(t);
                setPage(1);
              }}
            >
              {timeframeLabels[t]}
            </button>
          ))}
        </div>

        {/* Painel de Filtros Avançados */}
        {showAdvanced && (
          <div className="rounded border-2 border-black bg-card p-3 sm:p-4 shadow-xs sm:shadow-sm space-y-3 sm:space-y-4 animate-in fade-in-0 duration-150">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="font-head text-xs uppercase tracking-widest text-muted-foreground">
                Filtros detalhados
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="font-head text-xs uppercase tracking-wider text-destructive hover:underline cursor-pointer"
                >
                  Limpar todos ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              {/* Filtro por Cidade */}
              <div className="space-y-1">
                <label className="block font-head text-xs uppercase tracking-wide text-foreground">
                  Cidade
                </label>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setPage(1);
                  }}
                  className="w-full cursor-pointer border-2 border-black bg-background px-2.5 py-1.5 sm:px-3 sm:py-2 font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Todas as cidades</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Formato de Assento */}
              <div className="space-y-1">
                <label className="block font-head text-xs uppercase tracking-wide text-foreground">
                  Formato
                </label>
                <select
                  value={seatingMode}
                  onChange={(e) => {
                    setSeatingMode(e.target.value as '' | 'SEATED' | 'STANDING');
                    setPage(1);
                  }}
                  className="w-full cursor-pointer border-2 border-black bg-background px-2.5 py-1.5 sm:px-3 sm:py-2 font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Todos os formatos</option>
                  <option value="SEATED">Assentos Marcados</option>
                  <option value="STANDING">Pista / Entrada Livre</option>
                </select>
              </div>

              {/* Filtro por Faixa de Preço */}
              <div className="space-y-1">
                <label className="block font-head text-xs uppercase tracking-wide text-foreground">
                  Preço
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => {
                    setPriceRange(e.target.value as PriceRangeOption);
                    setPage(1);
                  }}
                  className="w-full cursor-pointer border-2 border-black bg-background px-2.5 py-1.5 sm:px-3 sm:py-2 font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Todos os preços</option>
                  <option value="under30">Até R$ 30,00</option>
                  <option value="30to60">R$ 30,00 a R$ 60,00</option>
                  <option value="over60">Acima de R$ 60,00</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="space-y-1">
                <label className="block font-head text-xs uppercase tracking-wide text-foreground">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="w-full cursor-pointer border-2 border-black bg-background px-2.5 py-1.5 sm:px-3 sm:py-2 font-mono text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="date_asc">{sortLabels.date_asc}</option>
                  <option value="price_asc">{sortLabels.price_asc}</option>
                  <option value="price_desc">{sortLabels.price_desc}</option>
                  <option value="title_asc">{sortLabels.title_asc}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Chips de Filtros Ativos */}
        {activeFiltersCount > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-muted-foreground text-[10px] sm:text-[11px] uppercase tracking-wider">
                Filtros ativos ({activeFiltersCount}):
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="font-head text-[10px] sm:text-[11px] uppercase tracking-wider text-destructive hover:underline cursor-pointer"
              >
                Limpar todos ×
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {search && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  Busca: “{search}”
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {category && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {category === 'MOVIE' ? 'Filmes' : 'Shows'}
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {timeframe !== 'all' && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {timeframeLabels[timeframe]}
                  <button
                    type="button"
                    onClick={() => {
                      setTimeframe('all');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {city && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {city}
                  <button
                    type="button"
                    onClick={() => {
                      setCity('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {seatingMode && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {seatingMode === 'SEATED' ? 'Assentos' : 'Pista'}
                  <button
                    type="button"
                    onClick={() => {
                      setSeatingMode('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {priceRange && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {priceRange === 'under30' ? 'Até R$ 30' : priceRange === '30to60' ? 'R$ 30 a R$ 60' : 'Acima de R$ 60'}
                  <button
                    type="button"
                    onClick={() => {
                      setPriceRange('');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {sortBy !== 'date_asc' && (
                <span className="inline-flex items-center gap-1 border-2 border-black bg-card px-2 py-0.5 font-bold shadow-xs text-[11px] sm:text-xs">
                  {sortLabels[sortBy]}
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('date_asc');
                      setPage(1);
                    }}
                    className="hover:text-destructive cursor-pointer font-bold ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback de Carregamento e Erro */}
      {isPending && <Spinner label="Buscando eventos…" />}
      {isError && <ErrorBox message="Não foi possível carregar os eventos." />}

      {/* Grade de Eventos */}
      {data && (
        <>
          {filteredItems.length === 0 ? (
            <div className="rounded border-2 border-dashed border-black/40 py-16 text-center space-y-3">
              <p className="font-head text-lg tracking-tight">Nenhum evento encontrado</p>
              <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto">
                Não há eventos disponíveis para {timeframe !== 'all' ? `a data "${timeframeLabels[timeframe]}"` : 'os filtros selecionados'}.
              </p>
              {activeFiltersCount > 0 && (
                <Button size="sm" variant="outline" onClick={clearAllFilters} className="font-head text-xs uppercase tracking-wide">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              {filteredItems.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {/* Paginação */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-head text-xs uppercase tracking-wide"
              >
                ← Anterior
              </Button>
              <span className="font-mono text-sm text-muted-foreground">
                Página <strong className="text-foreground">{data.page}</strong> de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-head text-xs uppercase tracking-wide"
              >
                Próxima →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
