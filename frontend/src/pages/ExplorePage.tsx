import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EventsPage } from '../api/types';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { ErrorBox, Spinner } from '../components/ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | 'MOVIE' | 'SHOW'>('');
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useQuery<EventsPage>({
    queryKey: ['events', { search, category, page }],
    queryFn: async ({ signal }) => {
      const res = await api.get<EventsPage>('/events', {
        params: {
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
          page,
        },
        signal,
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  const filters: { value: '' | 'MOVIE' | 'SHOW'; label: string }[] = [
    { value: '', label: 'Tudo' },
    { value: 'MOVIE', label: 'Filmes' },
    { value: 'SHOW', label: 'Shows' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-head text-3xl tracking-tight">Explorar eventos</h1>
        <p className="text-muted-foreground">
          Filmes em cartaz e shows publicados pelos organizadores.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submit} className="flex-1">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por evento, casa ou cidade…"
          />
        </form>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={category === f.value ? 'default' : 'outline'}
              onClick={() => {
                setCategory(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isPending && <Spinner label="Buscando eventos…" />}
      {isError && <ErrorBox message="Não foi possível carregar os eventos." />}

      {data && (
        <>
          {data.items.length === 0 ? (
            <div className="rounded border-2 border-dashed border-black/40 py-16 text-center text-muted-foreground">
              Nenhum evento encontrado para esta busca.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {data.items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="font-mono text-sm text-muted-foreground">
                {data.page}/{data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
