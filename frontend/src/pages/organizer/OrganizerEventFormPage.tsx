import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CatalogItem, CatalogResult, EventItem } from '../../api/types';
import { api, apiErrorMessage, formatBRL } from '../../api/client';
import { Badge, ErrorBox, Poster, Spinner } from '../../components/ui';

interface EventForm {
  title: string;
  description: string;
  posterUrl: string | null;
  venue: string;
  city: string;
  startsAt: string;
  price: string;
  rowsCount: string;
  seatsPerRow: string;
  capacity: string;
}

const emptyForm: EventForm = {
  title: '',
  description: '',
  posterUrl: null,
  venue: '',
  city: '',
  startsAt: '',
  price: '',
  rowsCount: '6',
  seatsPerRow: '10',
  capacity: '500',
};

export default function OrganizerEventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<'MOVIE' | 'SHOW'>('MOVIE');
  const [seatingMode, setSeatingMode] = useState<'SEATED' | 'STANDING'>('SEATED');
  const [catalogRef, setCatalogRef] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const editing = !!id;

  const { data: event } = useQuery<EventItem>({
    queryKey: ['event', id],
    queryFn: async () => (await api.get<EventItem>(`/events/${id}`)).data,
    enabled: editing,
  });

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title,
      description: event.description,
      posterUrl: event.posterUrl,
      venue: event.venue,
      city: event.city,
      startsAt: new Date(event.startsAt).toISOString().slice(0, 16),
      price: (event.priceCents / 100).toFixed(2).replace('.', ','),
      rowsCount: String(event.rowsCount ?? 6),
      seatsPerRow: String(event.seatsPerRow ?? 10),
      capacity: String(event.capacity ?? 500),
    });
    setCategory(event.category);
    setSeatingMode(event.seatingMode);
  }, [event]);

  const [catalogSearch, setCatalogSearch] = useState('');
  const { data: catalog, isFetching: catalogLoading } = useQuery<CatalogResult>({
    queryKey: ['catalog', category, catalogSearch],
    queryFn: async () =>
      (
        await api.get<CatalogResult>('/catalog', {
          params: { category, ...(catalogSearch ? { search: catalogSearch } : {}) },
        })
      ).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const priceCents = Math.round(
        Number(form.price.replace(/\./g, '').replace(',', '.')) * 100,
      );
      const body = {
        category,
        catalogRef: catalogRef ?? undefined,
        title: form.title,
        description: form.description,
        posterUrl: form.posterUrl ?? undefined,
        venue: form.venue,
        city: form.city,
        startsAt: new Date(form.startsAt).toISOString(),
        seatingMode,
        ...(seatingMode === 'SEATED'
          ? { rowsCount: Number(form.rowsCount), seatsPerRow: Number(form.seatsPerRow) }
          : { capacity: Number(form.capacity) }),
        priceCents,
      };
      if (editing) {
        const { category: _c, catalogRef: _r, posterUrl: _p, seatingMode: _s, ...rest } = body;
        return api.patch(`/events/${id}`, rest);
      }
      return api.post('/events', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer-events'] });
      navigate('/organizador');
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function pickItem(item: CatalogItem) {
    setCatalogRef(item.ref);
    setForm((f) => ({
      ...f,
      title: item.title,
      description: item.description,
      posterUrl: item.posterUrl,
    }));
  }

  const input =
    'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-amber-400';
  const label = 'block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {editing ? 'Editar evento' : 'Criar evento'}
        </h1>
        <p className="mt-1 text-zinc-400">
          {editing
            ? 'Ajustes disponíveis apenas para eventos em rascunho.'
            : 'Escolha do catálogo externo, defina data, local, capacidade e preço.'}
        </p>
      </div>

      {!editing && (
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">1 · Catálogo {category === 'MOVIE' ? '(TMDB)' : '(shows)'}</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-zinc-700 p-0.5">
                {(['MOVIE', 'SHOW'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setCatalogRef(null);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      category === c
                        ? 'bg-amber-400 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {c === 'MOVIE' ? 'Filmes' : 'Shows'}
                  </button>
                ))}
              </div>
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar…"
                className="w-44 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {catalogLoading ? (
            <Spinner label="Consultando catálogo…" />
          ) : (
            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {catalog?.items.map((item) => (
                <button
                  key={item.ref}
                  onClick={() => pickItem(item)}
                  className={`group overflow-hidden rounded-xl border text-left transition ${
                    catalogRef === item.ref
                      ? 'border-amber-400 ring-1 ring-amber-400/50'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="aspect-[2/3]">
                    <Poster src={item.posterUrl} alt={item.title} />
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-xs font-medium leading-snug">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {item.genre ?? item.releaseYear ?? ''}
                    </p>
                  </div>
                </button>
              ))}
              {catalog?.items.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-zinc-500">
                  Nada encontrado no catálogo.
                </p>
              )}
            </div>
          )}
          {catalog?.source === 'fallback' && (
            <p className="text-xs text-zinc-500">
              TMDB_API_KEY ausente — exibindo catálogo local de fallback.
            </p>
          )}
        </section>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
        className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h2 className="font-semibold">2 · Dados do evento</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Título</label>
            <input
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Descrição</label>
            <textarea
              className={`${input} min-h-24 resize-y`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              minLength={10}
            />
          </div>
          <div>
            <label className={label}>Local (casa/teatro)</label>
            <input
              className={input}
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={label}>Cidade</label>
            <input
              className={input}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={label}>Data e hora</label>
            <input
              type="datetime-local"
              className={input}
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={label}>Preço por ingresso (R$)</label>
            <input
              className={input}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="45,00"
              required
              pattern="\d+([.,]\d{1,2})?"
            />
          </div>
        </div>

        {!editing && (
          <>
            <div>
              <label className={label}>Formato do espaço</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { mode: 'SEATED', title: 'Assentos marcados', hint: 'Cinema / teatro com mapa' },
                    { mode: 'STANDING', title: 'Pista', hint: 'Capacidade total sem lugar marcado' },
                  ] as const
                ).map((opt) => (
                  <button
                    type="button"
                    key={opt.mode}
                    onClick={() => setSeatingMode(opt.mode)}
                    className={`rounded-xl border p-3 text-left transition ${
                      seatingMode === opt.mode
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <p className="text-sm font-semibold">{opt.title}</p>
                    <p className="text-xs text-zinc-500">{opt.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {seatingMode === 'SEATED' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Fileiras (A–Z)</label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    className={input}
                    value={form.rowsCount}
                    onChange={(e) => setForm({ ...form, rowsCount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={label}>Assentos por fileira</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={input}
                    value={form.seatsPerRow}
                    onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-56">
                <label className={label}>Capacidade (pista)</label>
                <input
                  type="number"
                  min={1}
                  className={input}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                />
              </div>
            )}
          </>
        )}

        {error && <ErrorBox message={error} />}

        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <Link to="/organizador" className="text-sm text-zinc-400 hover:text-zinc-200">
            Cancelar
          </Link>
          <button
            disabled={create.isPending}
            className="rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {create.isPending
              ? 'Salvando…'
              : editing
                ? 'Salvar alterações'
                : 'Criar em rascunho'}
          </button>
        </div>

        {form.price && (
          <p className="text-right text-xs text-zinc-500">
            Preço unitário:{' '}
            <span className="font-semibold text-amber-400">
              {formatBRL(
                Math.round(
                  Number(form.price.replace(/\./g, '').replace(',', '.')) * 100,
                ),
              )}
            </span>
          </p>
        )}
      </form>

      {!editing && form.title && (
        <p className="text-center text-xs text-zinc-500">
          Selecionado do catálogo: <Badge>{form.title}</Badge>
        </p>
      )}
    </div>
  );
}
