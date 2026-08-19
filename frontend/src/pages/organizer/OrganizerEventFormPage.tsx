import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CatalogItem, CatalogResult, EventItem } from '../../api/types';
import { api, apiErrorMessage, formatBRL } from '../../api/client';
import { Badge, ErrorBox, Poster, Spinner } from '../../components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

function toLocalDatetimeInput(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function DateHint({ value }: { value: string }) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);

  return (
    <p className="font-mono text-xs text-muted-foreground">
      → {weekday}, {day} de {monthName} de {year} às {hours}:{minutes}
    </p>
  );
}

export default function OrganizerEventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<'MOVIE' | 'SHOW'>('MOVIE');
  const [seatingMode, setSeatingMode] = useState<'SEATED' | 'STANDING'>('SEATED');
  const [catalogRef, setCatalogRef] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [sessions, setSessions] = useState<string[]>(['']);
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
      startsAt: toLocalDatetimeInput(event.startsAt),
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
      if (editing) {
        const body = {
          title: form.title,
          description: form.description,
          venue: form.venue,
          city: form.city,
          startsAt: new Date(form.startsAt).toISOString(),
          priceCents,
        };
        return api.patch(`/events/${id}`, body);
      }
      const body = {
        category,
        catalogRef: catalogRef ?? undefined,
        title: form.title,
        description: form.description,
        posterUrl: form.posterUrl ?? undefined,
        venue: form.venue,
        city: form.city,
        // filme em cartaz: cada sessão vira um evento próprio
        sessionsAt: sessions
          .filter(Boolean)
          .map((d) => new Date(d).toISOString()),
        seatingMode,
        ...(seatingMode === 'SEATED'
          ? { rowsCount: Number(form.rowsCount), seatsPerRow: Number(form.seatsPerRow) }
          : { capacity: Number(form.capacity) }),
        priceCents,
      };
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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-head text-3xl tracking-tight">
          {editing ? 'Editar evento' : 'Criar evento'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {editing
            ? 'Ajustes disponíveis apenas para eventos em rascunho.'
            : 'Escolha do catálogo externo, defina data, local, capacidade e preço.'}
        </p>
      </div>

      {!editing && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-head">
                1 · Catálogo{' '}
                <span className="font-mono text-xs uppercase text-muted-foreground">
                  ({category === 'MOVIE' ? 'TMDB' : 'shows'})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded border-2 border-black bg-card p-0.5">
                  {(['MOVIE', 'SHOW'] as const).map((c) => (
                    <Button
                      key={c}
                      size="xs"
                      variant={category === c ? 'default' : 'ghost'}
                      onClick={() => {
                        setCategory(c);
                        setCatalogRef(null);
                      }}
                    >
                      {c === 'MOVIE' ? 'Filmes' : 'Shows'}
                    </Button>
                  ))}
                </div>
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="w-40"
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
                    className={cn(
                      'overflow-hidden rounded border-2 border-black bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow',
                      catalogRef === item.ref && 'ring-4 ring-primary',
                    )}
                  >
                <div className="aspect-[2/3]">
                  <Poster src={item.posterUrl} alt={item.title} genre={item.genre ?? undefined} className="border-0" />
                </div>
                    <div className="border-t-2 border-black p-2">
                      <p className="line-clamp-2 text-xs font-bold leading-snug">{item.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {item.genre ?? item.releaseYear ?? ''}
                      </p>
                    </div>
                  </button>
                ))}
                {catalog?.items.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    Nada encontrado no catálogo.
                  </p>
                )}
              </div>
            )}
            {catalog?.source === 'fallback' && (
              <p className="font-mono text-xs text-muted-foreground">
                TMDB_API_KEY ausente, usando catálogo local de fallback.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5">
          <h2 className="font-head">2 · Dados do evento</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (editing) {
                create.mutate();
                return;
              }
              const invalid = sessions.filter(
                (s) => !s || new Date(s).getTime() <= Date.now(),
              );
              if (invalid.length > 0) {
                setError('Remova as sessões com data no passado — não é possível criá-las');
                return;
              }
              create.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="desc">Descrição</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  minLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venue">Local (casa/teatro)</Label>
                <Input
                  id="venue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>
              {editing ? (
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt">Data e hora</Label>
                  <DatePicker
                    value={form.startsAt}
                    onChange={(val) => setForm({ ...form, startsAt: val })}
                    required
                  />
                  <DateHint value={form.startsAt} />
                </div>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    Sessões (data e hora) — adicione uma por exibição
                  </Label>
                  <div className="space-y-2">
                    {sessions.map((value, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex gap-2">
                          <DatePicker
                            value={value}
                            required
                            onChange={(val) =>
                              setSessions((prev) =>
                                prev.map((v, i) => (i === index ? val : v)),
                              )
                            }
                          />
                          {sessions.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Remover sessão"
                              onClick={() =>
                                setSessions((prev) => prev.filter((_, i) => i !== index))
                              }
                            >
                              ×
                            </Button>
                          )}
                        </div>
                        <DateHint value={value} />
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setSessions((prev) => [...prev, ''])}
                  >
                    + Adicionar sessão
                  </Button>
                  <p className="font-mono text-xs text-muted-foreground">
                    cada sessão vira um evento com mapa de assentos próprio
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="price">Preço por ingresso (R$)</Label>
                <Input
                  id="price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="45,00"
                  required
                />
              </div>
            </div>

            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Formato do espaço</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { mode: 'SEATED', title: 'Assentos marcados', hint: 'Cinema / teatro com mapa' },
                        { mode: 'STANDING', title: 'Pista', hint: 'Capacidade sem lugar marcado' },
                      ] as const
                    ).map((opt) => (
                      <button
                        type="button"
                        key={opt.mode}
                        onClick={() => setSeatingMode(opt.mode)}
                        className={cn(
                          'rounded border-2 border-black p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow',
                          seatingMode === opt.mode ? 'bg-primary' : 'bg-card',
                        )}
                      >
                        <p className="font-head text-sm">{opt.title}</p>
                        <p className="text-xs text-muted-foreground">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {seatingMode === 'SEATED' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rows">Fileiras (A–Z)</Label>
                      <Input
                        id="rows"
                        type="number"
                        min={1}
                        max={26}
                        value={form.rowsCount}
                        onChange={(e) => setForm({ ...form, rowsCount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="perRow">Assentos por fileira</Label>
                      <Input
                        id="perRow"
                        type="number"
                        min={1}
                        max={30}
                        value={form.seatsPerRow}
                        onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-56 space-y-1.5">
                    <Label htmlFor="capacity">Capacidade (pista)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {error && <ErrorBox message={error} />}

            <div className="flex items-center justify-between border-t-2 border-dashed border-black/30 pt-4">
              <Button variant="ghost" type="button" nativeButton={false} render={<Link to="/organizador" />}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending
                  ? 'Salvando…'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar em rascunho'}
              </Button>
            </div>

            {form.price && (
              <p className="text-right font-mono text-xs text-muted-foreground">
                preço unitário:{' '}
                <span className="font-bold text-foreground">
                  {formatBRL(
                    Math.round(Number(form.price.replace(/\./g, '').replace(',', '.')) * 100),
                  )}
                </span>
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {!editing && form.title && (
        <p className="text-center font-mono text-xs text-muted-foreground">
          selecionado: <Badge>{form.title}</Badge>
        </p>
      )}
    </div>
  );
}
