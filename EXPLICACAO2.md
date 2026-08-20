# Ingressa — Guia de Apresentação Técnica para Entrevistas

> **Objetivo deste documento**: Servir como roteiro estruturado para você explicar com confiança e autoridade cada decisão técnica, arquitetura e trecho de código da aplicação durante a entrevista técnica.

---

## 🎯 1. Visão Geral & Pitch do Projeto (1 minuto)

> *"O Ingressa é uma plataforma completa de venda e validação de ingressos em arquitetura monorepo moderna. O backend foi construído em **NestJS**, **Prisma ORM** e **PostgreSQL** (com **Redis** para concorrência de alta velocidade e tempo real via SSE). O frontend é uma SPA em **React + Vite + TypeScript** com o design system **Neo-brutalism**.*
>
> *A plataforma atende 3 personas distintas: o **Organizador** (que busca filmes e shows de um catálogo externo TMDb e cria eventos com mapa de assentos ou pista), o **Cliente** (que escolhe assentos em tempo real, reserva com hold temporário, paga com simulação detalhada de recusas/aprovações e recebe ingressos com QR Code seguro) e a **Portaria** (que valida ingressos via câmera ou código manual com proteção atômica contra validação dupla)."*

---

## 🏗️ 2. Back-End — Explicação dos Requisitos com Código

---

### 🔹 Requisito B1: Gestão de Chamadas para API Externa (TMDb / Discovery) com Fallback e Cache

#### 💡 Como explicar ao entrevistador:
> *"Para o catálogo de filmes, integrei a API do **TMDb (The Movie Database)** consumindo tanto os filmes em cartaz (`/movie/now_playing`) quanto a busca textual (`/search/movie`) com localização em português (`pt-BR`). Para não onerar a API externa e evitar *rate limits*, implementei um **cache em memória com TTL de 10 minutos** por termo de busca. Além disso, projetei um **mecanismo de fallback gracioso**: caso a API Key esteja ausente ou haja instabilidade de rede, a aplicação chaveia automaticamente para um catálogo local estático sem derrubar a experiência do organizador."*

#### 💻 Onde está no código:
📁 [`backend/src/catalog/catalog.service.ts`](file:///home/shadys/ingressa/backend/src/catalog/catalog.service.ts)

```typescript
// 1. Cache em memória com TTL
const CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class CatalogService {
  private cache = new Map<string, CacheEntry>();

  private async findMovies(search?: string, page = 1): Promise<CatalogResult> {
    const apiKey = this.config.get<string>('TMDB_API_KEY');
    
    // Resiliência: fallback local se não houver chave configurada
    if (!apiKey) {
      const term = search?.trim().toLowerCase();
      const items = term
        ? FALLBACK_MOVIES.filter((m) => m.title.toLowerCase().includes(term))
        : FALLBACK_MOVIES;
      return { items, page: 1, totalPages: 1, source: 'fallback' };
    }

    const path = search ? '/search/movie' : '/movie/now_playing';
    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'pt-BR',
      page: String(page),
    });
    if (search) params.set('query', search);

    const cacheKey = `${path}?${params}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const response = await fetch(`${TMDB_BASE}${path}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    
    if (!response.ok) {
      return { items: FALLBACK_MOVIES, page: 1, totalPages: 1, source: 'fallback' };
    }

    const data = await response.json();
    const result: CatalogResult = {
      items: data.results.map((movie) => this.mapTmdbMovie(movie)),
      page,
      totalPages: Math.min(data.total_pages, 20),
      source: 'tmdb',
    };

    this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }
}
```

---

### 🔹 Requisito B2: Autenticação e Autorização com 3 Papéis Distintos

#### 💡 Como explicar ao entrevistador:
> *"Modelei a autenticação usando **JWT (Passport-JWT)** com três papéis explícitos: `ORGANIZER`, `CUSTOMER` e `GATE`. A segurança foi construída no NestJS através de **Guards Globais** (`JwtAuthGuard` e `RolesGuard`). Por padrão, todos os endpoints exigem autenticação, a menos que anotados com o decorator `@Public()`. As permissões são declarativas via decorator `@Roles(...)`, garantindo que um cliente não crie eventos nem valide ingressos, e que a portaria acesse apenas a esteira de validação."*

#### 💻 Onde está no código:
📁 [`backend/src/auth/guards/roles.guard.ts`](file:///home/shadys/ingressa/backend/src/auth/guards/roles.guard.ts) e [`auth.service.ts`](file:///home/shadys/ingressa/backend/src/auth/auth.service.ts)

```typescript
// Guard declarativo aplicado globalmente
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    return !!user && required.includes(user.role);
  }
}
```

Exemplo de uso nos controllers:
```typescript
// Apenas Organizadores podem criar eventos
@Post()
@Roles('ORGANIZER')
create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) { ... }

// Portaria e Organizadores podem listar eventos para check-in
@Get('events')
@Roles('GATE', 'ORGANIZER')
listEvents(@CurrentUser() user: AuthUser) { ... }
```

---

### 🔹 Requisito B3: Armazenamento e Modelagem Relacional (Prisma + PostgreSQL)

#### 💡 Como explicar ao entrevistador:
> *"Estruturei o banco de forma relacional estrita com o Prisma no PostgreSQL, dividindo o domínio em 6 modelos: `User`, `Event`, `Seat`, `Reservation`, `Payment` e `Ticket`. As restrições de integridade incluem índices compostos como `@@unique([eventId, row, number])` na model `Seat` para impedir que existam dois assentos de mesmo nome no mesmo evento, e a restrição `code String @unique` na model `Ticket` para garantir unicidade global do código do ingresso no banco."*

#### 💻 Onde está no código:
📁 [`backend/prisma/schema.prisma`](file:///home/shadys/ingressa/backend/prisma/schema.prisma)

```prisma
model Event {
  id           String        @id @default(uuid())
  organizerId  String
  organizer    User          @relation(fields: [organizerId], references: [id])
  title        String
  category     String        // MOVIE | SHOW
  seatingMode  String        // SEATED | STANDING
  status       String        @default("DRAFT") // DRAFT | PUBLISHED | CANCELLED
  priceCents   Int
  seats        Seat[]
  reservations Reservation[]
  tickets      Ticket[]

  @@index([status, startsAt])
}

model Seat {
  id            String       @id @default(uuid())
  eventId       String
  event         Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  row           String
  number        Int
  reservationId String?
  reservation   Reservation? @relation(fields: [reservationId], references: [id], onDelete: SetNull)

  @@unique([eventId, row, number]) // O banco garante integridade física dos assentos
}

model Ticket {
  id            String       @id @default(uuid())
  code          String       @unique // Unicidade global do ingresso no banco
  reservationId String
  reservation   Reservation  @relation(fields: [reservationId], references: [id])
  eventId       String
  event         Event        @relation(fields: [eventId], references: [id])
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  seatId        String?      @unique
  seat          Seat?        @relation(fields: [seatId], references: [id])
  seatLabel     String?
  quantity      Int          @default(1)
  status        String       @default("VALID") // VALID | USED | CANCELLED
  checkedInAt   DateTime?
  createdAt     DateTime     @default(now())

  @@index([eventId, status])
}
```

---

### 🔹 Requisito B4: Garantia de que o Mesmo Lugar Nunca Seja Vendido Duas Vezes (Destaque de Arquitetura)

#### 💡 Como explicar ao entrevistador (Ponto mais importante da entrevista):
> *"Para resolver o problema clássico de *race condition* na reserva de assentos, adotei uma estratégia de **Defesa em Duas Camadas**:
> 1. **Garantia ACID (Atomicidade, Consistência, Isolamento e Durabilidade) no PostgreSQL (Rede de Segurança Indestrutível)**: A reserva ocorre dentro de uma transação `prisma.$transaction`. Executamos uma sentença condicional atômica `tx.seat.updateMany({ where: { id: { in: seatIds }, reservationId: null }, data: { reservationId: res.id } })`. No nível do banco, o PostgreSQL adquire um **Row-Level Lock** no `UPDATE`. Se duas requisições disputarem o mesmo assento no mesmo milissegundo, a primeira ganha e a segunda afeta menos linhas do que o requisitado, disparando rollback imediato e retornando `HTTP 409 Conflict`.
> 2. **Camada de Alta Performance com Redis Lock (Script Lua All-or-Nothing)**: Antes de bater no banco, um script Lua atômico no Redis tenta registrar o hold de todos os assentos com TTL de 10 minutos. Se qualquer um já estiver segurado, a resposta é imediata (< 1ms).
> 3. **Expiração Preguiçosa (Lazy) + Reativa**: Holds vencidos são limpos automaticamente antes de leituras/compras e via Redis Keyspace Notifications transmitidos via **Server-Sent Events (SSE)** para atualizar o mapa na tela dos usuários."*

#### 💻 Onde está no código:
📁 [`backend/src/reservations/reservations.service.ts`](file:///home/shadys/ingressa/backend/src/reservations/reservations.service.ts) e [`backend/src/seats/seats-hold.service.ts`](file:///home/shadys/ingressa/backend/src/seats/seats-hold.service.ts)

```typescript
// 1. Script Lua atômico no Redis (Hold All-or-Nothing)
const HOLD_LUA = `
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then return 0 end
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', ARGV[2])
end
return 1
`;

// 2. Transação Atômica Condicional no PostgreSQL
const reservation = await this.prisma.$transaction(async (tx) => {
  const reservation = await tx.reservation.create({
    data: {
      id: reservationId,
      userId: user.id,
      eventId,
      quantity: seatIds.length,
      totalCents: reservationTotal(priceCents, seatIds.length, halfCount),
      expiresAt: new Date(Date.now() + HOLD_SECONDS * 1000),
    },
  });

  // O pulo do gato: 'reservationId: null' garante que só assentos LIVRES são marcados
  const taken = await tx.seat.updateMany({
    where: {
      id: { in: seatIds },
      eventId,
      reservationId: null,
    },
    data: { reservationId: reservation.id },
  });

  // Se o Postgres atualizou menos assentos do que pedimos, alguém foi mais rápido
  if (taken.count !== seatIds.length) {
    throw new ConflictException('Um ou mais assentos acabaram de ser reservados');
  }

  return reservation;
});
```

---

### 🔹 Requisito B5: Geração de Ingresso com QR Code Não Forjável

#### 💡 Como explicar ao entrevistador:
> *"Os ingressos são emitidos **estritamente no backend** logo após a confirmação atômica do pagamento aprovado. O código do ingresso não usa sequenciais nem IDs previsíveis; ele é gerado através do módulo nativo `crypto.randomBytes(10)`, mapeado em um alfabeto Base32 sem caracteres visualmente ambíguos (eliminando `0/O` e `1/I`). O padrão gerado `ING-XXXXX-XXXXX` provê **~50 bits de entropia criptográfica CSPRNG**, tornando qualquer tentativa de adivinhação ou forjamento por força bruta computacionalmente impraticável."*

#### 💻 Onde está no código:
📁 [`backend/src/tickets/tickets.service.ts`](file:///home/shadys/ingressa/backend/src/tickets/tickets.service.ts)

```typescript
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateTicketCode() {
  const bytes = randomBytes(10);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  return `ING-${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

// Emissão pós-pagamento aprovado:
async issueForReservation(reservation: ReservationWithDetails) {
  return this.prisma.ticket.createManyAndReturn({
    data: seats.map((seat, i) => ({
      code: generateTicketCode(), // Código criptograficamente seguro e único
      reservationId: reservation.id,
      eventId: reservation.eventId,
      userId: reservation.userId,
      seatId: seat.id,
      seatLabel: `${seat.row}${seat.number}`,
      kind: i < halfCount ? 'HALF' : 'FULL',
      priceCents: i < halfCount ? halfPrice : fullPrice,
    })),
  });
}
```

---

### 🔹 Requisito B6: Compartilhamento de Ingresso via Link Público

#### 💡 Como explicar ao entrevistador:
> *"Desenhei o QR Code para conter a **URL canônica pública do ingresso** (`https://.../t/ING-XXXXX-XXXXX`). Criei um endpoint público `GET /api/tickets/code/:code` que devolve apenas os dados sanitizados para exibição pública (título do evento, data, local, primeiro nome do titular, assento e status de validade), sem expor dados sensíveis do cliente como e-mail ou dados de pagamento."*

#### 💻 Onde está no código:
📁 [`backend/src/tickets/tickets.service.ts`](file:///home/shadys/ingressa/backend/src/tickets/tickets.service.ts)

```typescript
@Get('code/:code')
@Public() // Acessível sem necessidade de autenticação
async getByCode(@Param('code') code: string) {
  return this.ticketsService.getByCode(code);
}
```

---

### 🔹 Requisito B7: Validação na Portaria com Proteção Anti-Revalidação Atômica

#### 💡 Como explicar ao entrevistador (Outro ponto alto de concorrência):
> *"Na portaria, duas catracas poderiam escanear o mesmo print de QR Code no mesmo instante. Se fizéssemos `findUnique` seguido de `update`, haveria uma janela de *race condition* onde ambas veriam `VALID` e liberariam a entrada.
> Para impedir isso, o check-in utiliza um **update condicional atômico**: `UPDATE tickets SET status = 'USED' WHERE id = :id AND status = 'VALID'`. O banco garante que exatamente **uma** instrução afeta 1 linha e recebe `VALID`; a segunda afeta 0 linhas e retorna imediatamente `ALREADY_USED` com a data e hora do primeiro check-in."*

#### 💻 Onde está no código:
📁 [`backend/src/gate/gate.service.ts`](file:///home/shadys/ingressa/backend/src/gate/gate.service.ts)

```typescript
async checkIn(user: AuthUser, eventId: string, rawCode: string): Promise<CheckInResult> {
  await this.assertGateAccess(user, eventId);
  const code = normalizeTicketCode(rawCode);

  const ticket = await this.prisma.ticket.findUnique({
    where: { code },
    include: { user: { select: { name: true } } },
  });

  if (!ticket) return { status: 'INVALID', reason: 'NOT_FOUND', message: 'Código inexistente.' };
  if (ticket.eventId !== eventId) return { status: 'INVALID', reason: 'WRONG_EVENT', message: 'Ingresso pertence a outro evento.' };
  if (ticket.status === 'CANCELLED') return { status: 'INVALID', reason: 'CANCELLED', message: 'Ingresso cancelado.' };
  if (ticket.status === 'USED') return { status: 'ALREADY_USED', message: `Já utilizado em ${this.formatDateTime(ticket.checkedInAt)}.` };

  // UPDATE ATÔMICO CONDICIONAL ANTI-RACE CONDITION:
  const claimed = await this.prisma.ticket.updateMany({
    where: { id: ticket.id, status: 'VALID' },
    data: { status: 'USED', checkedInAt: new Date() },
  });

  if (claimed.count === 0) {
    // Alguém validou milissegundos antes em outra catraca
    const fresh = await this.prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    return { status: 'ALREADY_USED', message: `Já utilizado em ${this.formatDateTime(fresh.checkedInAt)}.` };
  }

  return { status: 'VALID', message: 'Entrada liberada!' };
}
```

---

## 🎨 3. Front-End — Explicação dos Requisitos com Código

---

### 🔹 Requisito F1: Busca e Navegação por Eventos

#### 💡 Como explicar ao entrevistador:
> *"Na `ExplorePage`, utilizei o **TanStack Query (React Query)** com a diretiva `placeholderData: keepPreviousData` para proporcionar uma transição de tela suave sem travamentos durante a busca e a paginação. Criei filtros por categoria (*Tudo / Filmes / Shows*), campo de busca unificado (título, casa de eventos ou cidade) e cards com o kit **Neo-brutalism** contendo datas em português, localização e preço formatado."*

#### 💻 Onde está no código:
📁 [`frontend/src/pages/ExplorePage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/ExplorePage.tsx)

```tsx
const { data, isPending, isError } = useQuery<EventsPage>({
  queryKey: ['events', { search, category, page }],
  queryFn: async ({ signal }) => {
    const res = await api.get<EventsPage>('/events', {
      params: { ...(search ? { search } : {}), ...(category ? { category } : {}), page },
      signal,
    });
    return res.data;
  },
  placeholderData: keepPreviousData, // Evita flash de loading durante a paginação
});
```

---

### 🔹 Requisito F2: Criação e Gestão de Eventos pelo Organizador

#### 💡 Como explicar ao entrevistador:
> *"No painel do organizador (`OrganizerEventsPage`), o usuário tem visão gerencial de cada evento, status das sessões (*Rascunho / Publicado / Cancelado*) e total de ingressos vendidos. Na criação (`OrganizerEventFormPage`), implementei um fluxo em 2 passos: no Passo 1, o organizador pesquisa e seleciona diretamente no catálogo do TMDb/Shows (que já preenche pôster, título e descrição automaticamente); no Passo 2, define datas (inclusive múltiplas sessões), preços e o formato do local (Assentos com fileiras A-Z ou Pista com capacidade máxima)."*

#### 💻 Onde está no código:
📁 [`frontend/src/pages/organizer/OrganizerEventFormPage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/organizer/OrganizerEventFormPage.tsx)

```tsx
// Seleção do catálogo externo pré-preenche o formulário
function pickItem(item: CatalogItem) {
  setCatalogRef(item.ref);
  setForm((f) => ({
    ...f,
    title: item.title,
    description: item.description,
    posterUrl: item.posterUrl,
  }));
}
```

---

### 🔹 Requisito F3: Fluxo de Reserva (Mapa de Assentos + Pista + Meia-Entrada)

#### 💡 Como explicar ao entrevistador:
> *"Superando a especificação que solicitava um dos dois formatos, implementei **ambos os modelos**:
> - **Eventos com Assentos (SEATED)**: Renderiza um mapa SVG/CSS responsivo com representação semântica de *Tela* (Cinema) ou *Palco* (Shows), separação de fileiras A–Z, botões interativos por assento (*Livre, Selecionado, Ocupado*) e sincronização em tempo real via **Server-Sent Events (SSE)**.
> - **Eventos de Pista (STANDING)**: Renderiza um stepper numérico com limite dinâmico de disponibilidade.
> - **Benefício da Meia-Entrada**: Seletor com cálculo dinâmico de valor com base na cota de meias selecionadas."*

#### 💻 Onde está no código:
📁 [`frontend/src/components/SeatMapPicker.tsx`](file:///home/shadys/ingressa/frontend/src/components/SeatMapPicker.tsx) e [`frontend/src/pages/EventDetailPage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/EventDetailPage.tsx)

```tsx
// Sincronização em tempo real do mapa via SSE
useEffect(() => {
  if (!id || !isSeated) return;
  const source = new EventSource(`${API_BASE}/events/${id}/seats/stream`);
  source.onmessage = (message) => {
    if (message.data.includes('seats-updated')) {
      void queryClient.invalidateQueries({ queryKey: ['seats', id] });
    }
  };
  return () => source.close();
}, [id, isSeated, queryClient]);
```

---

### 🔹 Requisito F4: Pagamento Simulado com Respostas da Stripe

#### 💡 Como explicar ao entrevistador:
> *"No checkout (`CheckoutPage`), simulei o comportamento real de gateways de pagamento como a Stripe. O cliente visualiza a contagem regressiva do hold de 10 minutos. O backend mapeia os números oficiais de teste: o cartão `4242...` aprova, enquanto cartões como `4000...0002` disparam recusas reais (`card_declined`, `insufficient_funds`, `expired_card`, etc.). Caso o cartão seja recusado, o formulário exibe o alerta específico e **mantém a reserva PENDING**, permitindo ao cliente testar outro cartão sem perder o assento."*

#### 💻 Onde está no código:
📁 [`frontend/src/pages/CheckoutPage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/CheckoutPage.tsx)

```tsx
{declined && (
  <Alert status="error">
    <AlertTitle>Pagamento recusado · {pay.data?.declineCode}</AlertTitle>
    <AlertDescription>
      {pay.data?.declineMessage ?? 'Tente outro cartão. A reserva continua válida até a expiração.'}
    </AlertDescription>
  </Alert>
)}
```

---

### 🔹 Requisito F5: Área "Meus Ingressos" com Bilhete Estilizado e QR Code

#### 💡 Como explicar ao entrevistador:
> *"Na página `MyTicketsPage`, criei cards que simulam o visual de bilhetes físicos de cinema/show, com picote lateral, recortes semicirculares e código de barras decorativo. O QR Code é gerado via SVG com a biblioteca `qrcode.react` apontando para o link público `/t/:code`. Além disso, se o usuário tiver reservas pendentes não pagas, elas aparecem em destaque no topo com um timer regressivo em tempo real e botão de pagamento direto."*

#### 💻 Onde está no código:
📁 [`frontend/src/pages/MyTicketsPage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/MyTicketsPage.tsx)

```tsx
<div className="rounded border-2 border-black bg-white p-2">
  <QRCodeSVG value={shareUrl} size={96} level="M" />
</div>
<code className="font-mono text-[11px] font-bold tracking-wider">{ticket.code}</code>
```

---

### 🔹 Requisito F6 e F7: Portaria com Câmera, Entrada Manual e Retornos Claros

#### 💡 Como explicar ao entrevistador:
> *"Na tela de validação da portaria (`GateCheckPage`), carreguei a biblioteca `html5-qrcode` de forma sob demanda (*lazy loading*) para não inflar o bundle inicial da aplicação. O leitor ativa a câmera traseira (`facingMode: environment`) e, ao capturar o QR Code, extrai o código automaticamente e faz a requisição. Também forneci o campo de digitação manual com uma função de normalização (`extractCode`) que aceita o código puro (`ING-...`), em minúsculas ou o link completo colado da URL. O retorno é exibido com alto contraste e alertas Neo-brutalism em 4 estados: **Válido (Verde)**, **Já Utilizado (Amarelo com data/hora)**, **Inválido (Vermelho)** e **Evento Errado (Vermelho com aviso de qual é o evento correto)**."*

#### 💻 Onde está no código:
📁 [`frontend/src/pages/gate/GateCheckPage.tsx`](file:///home/shadys/ingressa/frontend/src/pages/gate/GateCheckPage.tsx)

```tsx
// Leitor de Câmera integrado com Html5Qrcode
async function startCamera() {
  const scanner = new Html5Qrcode('qr-reader');
  scannerRef.current = scanner;
  await scanner.start(
    { facingMode: 'environment' },
    { fps: 8, qrbox: { width: 220, height: 220 } },
    (decoded) => {
      const code = extractCode(decoded); // Extrai o código mesmo se for URL completa
      if (!checkIn.isPending) {
        scanner.stop().then(() => setCameraOn(false));
        checkIn.mutate(code);
      }
    },
    () => undefined,
  );
}
```

---

## 💡 4. Perguntas Desafiadoras de Entrevista & Respostas Prontas

### ❓ P1: *"Por que você usou o link completo dentro do QR Code em vez do código puro?"*
> **Sua Resposta**: *"Essa foi uma decisão intencional de UX e interoperabilidade. Quando o QR Code contém o link completo (`https://app.com/t/ING-...`), se qualquer pessoa ou câmera padrão de smartphone escanear o ingresso, ele abre imediatamente a página pública de visualização com os dados do evento. Ao mesmo tempo, na portaria, a função de normalização `normalizeTicketCode` usa regex para extrair o código `ING-...` da URL automaticamente. Assim, o mesmo QR Code serve tanto para o cliente compartilhar quanto para o porteiro validar."*

### ❓ P2: *"O que acontece se a aplicação estiver sem Redis?"*
> **Sua Resposta**: *"O sistema foi arquitetado com **degradação graciosa**. O Redis é opcional (`REDIS_URL`). Sem o Redis, perdemos apenas o broadcast em tempo real via SSE e o lock em memória sub-milissegundo, mas **todas as garantias de consistência e anti-venda dupla permanecem 100% ativas no PostgreSQL** através das transações ACID e dos `updateMany` condicionais com row lock."*

### ❓ P3: *"Por que você optou por expiração 'preguiçosa' (lazy) das reservas em vez de um Cron Job?"*
> **Sua Resposta**: *"Para este escopo, a expiração preguiçosa (`expireStaleReservations`) executada antes de consultas ao mapa, novas reservas e pagamentos oferece precisão de tempo real com complexidade operacional zero: não necessita de daemons em segundo plano, nem de agendadores de tarefas (como BullMQ ou crontab). Para complementar, quando o Redis está ativo, usamos as `Keyspace Notifications` de expiração de chave para disparar a limpeza de forma reativa instantaneamente."*

### ❓ P4: *"Como você garantiu que dois porteiros não validem o mesmo ingresso ao mesmo tempo?"*
> **Sua Resposta**: *"Utilizei uma única instrução SQL atômica condicional no PostgreSQL: `UPDATE tickets SET status = 'USED', checked_in_at = NOW() WHERE id = :id AND status = 'VALID'`. Como a cláusula `WHERE` exige `status = 'VALID'`, o banco serializa a escrita. Exatamente uma requisição altera 1 linha e ganha o status `VALID`; qualquer outra requisição concorrente no mesmo milissegundo altera 0 linhas e é imediatamente tratada como `ALREADY_USED`."*

---

### ❓ P5: *"Por que o uso do Redis com SSE (Server-Sent Events) é essencial aqui e como funciona cada um?"*
> **Sua Resposta**: *"Em sistemas de alta concorrência de venda de ingressos, a combinação de **Redis + SSE** resolve dois grandes gargalos: o **Assento Fantasma** (quando dois usuários tentam pagar pelo mesmo assento por falta de sincronização visual) e o **DDoS acidental no banco** (polling contínuo).*
>
> 1. **Como o Redis funciona**:
>    - **Hold em Memória (< 1ms)**: Valida e trava os assentos com TTL de 10 min em memória antes de abrir transação no PostgreSQL.
>    - **Keyspace Notifications**: Quando o hold de 10 min expira, o Redis emite um evento no canal Pub/Sub interno (`__keyevent@0__:expired`). O backend intercepta, limpa o assento no PostgreSQL e notifica a sala SSE.
> 2. **Como o SSE funciona**:
>    - É um stream HTTP unidirecional leve (`text/event-stream`). Diferente do WebSocket (que é bidirecional e complexo), o SSE utiliza HTTP padrão com reconexão automática nativa do navegador (`new EventSource()`).
>    - O controller `SeatsStreamController` mantém uma sala por evento com heartbeat a cada 25s. Quando há qualquer alteração no mapa (reserva, cancelamento ou expiração), o backend emite o evento `seats-updated`.
> 3. **O Ciclo Virtuoso**:
>    - Se um cliente fecha a aba sem pagar, após 10 min o Redis expira a chave ➔ backend cancela a reserva no Postgres ➔ SSE notifica todos os clientes conectados ➔ o assento **volta a ficar verde (livre)** na tela de todo mundo instantaneamente, com zero polling no PostgreSQL!"*

---

### ❓ P6: *"O que é um script atômico em Lua e por que ele foi usado no Redis?"*
> **Sua Resposta**: *"Lua é uma linguagem de script leve e extremamente rápida embutida diretamente dentro do motor do Redis. A palavra **'atômico'** vem do conceito de indivisível: significa que o conjunto de instruções do script é executado do início ao fim como se fosse uma **única operação indivisível**, sem que nenhuma outra requisição consiga se intrometer no meio.*
>
> 1. **O problema real sem o Script Lua (*Race Condition / Check-then-Act*)**:
>    - Se tentássemos reservar assentos vizinhos (ex: `A1` e `A2`) fazendo comandos comuns e separados do Node.js (`EXISTS A1`, `EXISTS A2`, depois `SET A1`, `SET A2`), haveria uma brecha de milissegundos na rede.
>    - Se outro cliente comprasse o `A2` bem no meio do caminho, o primeiro cliente acabaria travando apenas o `A1` e recebendo erro no `A2`, ficando com uma **reserva picada/incompleta**.
> 2. **A solução com o script Lua (`HOLD_LUA`)**:
>    - O Redis é *single-threaded* para a execução de comandos. Ao rodar o script Lua via `EVAL`, o Redis bloqueia qualquer outro comando até que o script termine.
>    - O script funciona com semântica **Tudo ou Nada (*All-or-Nothing*)**:
>      - **Passo 1 (Checagem)**: Varre todos os assentos requisitados. Se **qualquer um** já estiver ocupado, o script aborta imediatamente e retorna `0`.
>      - **Passo 2 (Gravação)**: Se todos estiverem livres, grava o hold em todos com TTL de 10 minutos e retorna `1`.
>    - Isso elimina múltiplas viagens de rede (*zero network round-trips*), garante consistência perfeita em memória RAM em menos de 0.5ms e impede reservas parciais."*

```lua
-- Trecho real do HOLD_LUA (backend/src/seats/seats-hold.service.ts):
-- PASSO 1: CHECAGEM (Verifica se ALGUM dos assentos já tem dono)
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then 
    return 0 -- Pelo menos 1 assento já está ocupado. Aborta tudo na hora!
  end
end

-- PASSO 2: GRAVAÇÃO (Se passou pelo Passo 1, TODOS estão 100% livres)
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', ARGV[2]) -- Trava todos com TTL de 10 min
end

return 1 -- Sucesso total!
```

---

## 🏁 5. Checklist Rápido para Rodar e Demonstrar na Entrevista

```bash
# 1. Instalação e migração
npm run install:all
cp backend/.env.example backend/.env
npm --prefix backend run migrate
npm --prefix backend run seed

# 2. Inicialização dos serviços
npm run dev:api    # Backend NestJS: http://localhost:3000
npm run dev:web    # Frontend React: http://localhost:5173
```

- **Contas de Teste (Senha `123456`)**:
  - `marina@vz.com` (Criação de eventos, sessões e portaria dos próprios)
  - `maria@vz.com` e `joao@vz.com` (Reserva, assentos, pagamento e meus ingressos)
  - `paulo@vz.com` (Validação de qualquer evento publicado)
- **Cartões de Teste Stripe**:
  - `4242 4242 4242 4242` → **Aprova**
  - `4000 0000 0000 0002` → **Recusa** (`card_declined`)
  - `4000 0000 0000 9995` → **Recusa** (`insufficient_funds`)
