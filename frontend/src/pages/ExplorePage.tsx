import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { EventsPage } from '../api/types';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { ErrorBox, Spinner } from '../components/ui';

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | 'MOVIE' | 'SHOW'>('');
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error } = useQuery<EventsPage>({
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
        <h1 className="text-3xl font-bold tracking-tight">Explorar eventos</h1>
        <p className="text-zinc-400">
          Filmes em cartaz e shows publicados pelos organizadores.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submit} className="flex-1">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por evento, casa ou cidade…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-amber-400"
          />
        </form>
        <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setCategory(f.value);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                category === f.value
                  ? 'bg-amber-400 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isPending && <Spinner label="Buscando eventos…" />}
      {isError && axios.isAxiosError(error) && (
        <ErrorBox message="Não foi possível carregar os eventos." />
      )}

      {data && (
        <>
          {data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-zinc-500">
              Nenhum evento encontrado para esta busca.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-500">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
