# Ingressa — Guia de Arquitetura e Requisitos

> Documento de referência para explicar o projeto. Mapeia cada requisito ao código
> real e explica as decisões técnicas. Não faz parte do repo — é seu material de estudo.

## Visão geral

Plataforma de eventos e ingressos em monorepo:

```
ingressa/
├── backend/    # NestJS + Prisma + PostgreSQL
└── frontend/   # React + Vite + Tailwind v4 + kit NeoBrutalism (Base UI)
```

Fluxo em uma frase: organizador cria eventos a partir de um catálogo externo
(TMDB), cliente reserva lugares (assentos ou pista), paga (simulado com cartões
de teste da Stripe), recebe ingresso com QR Code compartilhável por link, e a
portaria valida a entrada com câmera ou digitação manual.

Contas de demonstração (senha `123456` para todas):

| Papel       | E-mail                    | O que faz                          |
| ----------- | ------------------------- | ---------------------------------- |
| Organizador | organizador@ingressa.com  | cria/publica/cancela eventos, portaria dos próprios |
| Cliente     | cliente@ingressa.com      | reserva, paga, recebe ingressos    |
| Portaria    | portaria@ingressa.com     | valida ingressos em qualquer evento publicado |

---

## Matriz de requisitos → código

### Frontend

| Requisito | Onde está |
| --- | --- |
| Navegação e busca por eventos publicados (data, local, preço) | `frontend/src/pages/ExplorePage.tsx` + filtros Tudo/Filmes/Shows + paginação |
| Criação e gerenciamento de eventos | `pages/organizer/OrganizerEventFormPage.tsx` (catálogo + form) e `OrganizerEventsPage.tsx` (tabela com publicar/cancelar/editar) |
| Reserva com mapa de assentos | `components/SeatMapPicker.tsx` na `EventDetailPage.tsx` |
| Reserva por quantidade (pista) | stepper de quantidade na `EventDetailPage.tsx` (mesma página, muda por `seatingMode`) |
| Pagamento simulado (confirmação e recusa) | `pages/CheckoutPage.tsx` → `POST /payments/reservations/:id` |
| Meus ingressos com QR Code | `pages/MyTicketsPage.tsx` (stub de ingresso físico com picote + QR) |
| Compartilhamento por link | `pages/TicketSharePage.tsx` — rota pública `/t/:code` |
| Portaria com retorno claro | `pages/gate/GateCheckPage.tsx` — Alert verde (válido) / amarelo (já utilizado) / vermelho (inválido) |
| Leitura de QR pela câmera + digitação manual | `GateCheckPage.tsx` — html5-qrcode + input manual que aceita código ou link |

### Backend

| Requisito | Onde está |
| --- | --- |
| Gestão de chamadas à API externa (TMDB) | `src/catalog/catalog.service.ts` |
| Auth com 3 papéis (Organizador, Cliente, Portaria) | `src/auth/` + `@Roles()` guards |
| Armazenamento de eventos/reservas/ingressos | `prisma/schema.prisma` (6 modelos) + migrations |
| Mesmo lugar nunca vendido 2x | `src/reservations/reservations.service.ts` (transação condicional) |
| Ingresso não forjável | `src/tickets/tickets.service.ts` (código server-side com crypto) |
| Link de compartilhamento | `GET /api/tickets/code/:code` (público) + front `/t/:code` |
| Ingresso nunca validado 2x | `src/gate/gate.service.ts` (update atômico) |

---

## Como rodar

```bash
npm run install:all
cp backend/.env.example backend/.env
npm --prefix backend run migrate
npm --prefix backend run seed
npm run dev:api    # http://localhost:3000
npm run dev:web    # http://localhost:5173 (proxy /api → :3000)
```

Cartões de teste (padrão Stripe):

- `4242 4242 4242 4242` → aprovado
- `4000 0000 0000 0002` → recusado (`card_declined`)
- `4000 0000 0000 9995` → saldo insuficiente
- `4000 0000 0000 9987` → cartão perdido
- `4000 0000 0000 0069` → expirado
- `4000 0000 0000 0127` → CVV incorreto

---

## Backend — módulo a módulo

### `prisma/schema.prisma` — modelo de dados

```
User  1─n Event  1─n Seat
              │ 1─n Reservation  1─n Payment
              │           │ 1─n Ticket
User 1─n Reservation / Ticket
```

- Papéis/status são strings validadas na aplicação (DTOs), não enums do banco
  validados na aplicação (DTOs) e por índices.
- `Seat` tem índice **único** `(eventId, row, number)` — o banco garante que
  não existem dois assentos A1 no mesmo evento.
- IDs são UUID (necessário para `ParseUUIDPipe` nas rotas).

### `auth/` — três papéis

- JWT (passport-jwt) com payload `{sub, email, name, role}`.
- `JwtAuthGuard` global: toda rota exige token **exceto** marcadas com
  `@Public()`.
- `RolesGuard` global: rota com `@Roles('ORGANIZER','GATE')` só aceita esses
  papéis (cliente toma 403).
- Decoradores próprios: `@Public()`, `@Roles(...)`, `@CurrentUser()`.
- `role` no JWT evita ida ao banco a cada request — para um teste técnico,
  aceitável; o trade-off é que revogação de papel exige novo login.

### `catalog/` — TMDB com fallback

- `GET /api/catalog?category=MOVIE|SHOW&search=&page=`.
- Filmes: TMDB (`/movie/now_playing` ou `/search/movie`, pt-BR). Sem
  `TMDB_API_KEY` válida → catálogo local de 10 filmes (fallback), então o
  fluxo inteiro funciona offline.
- Shows: catálogo local estático (`catalog/data/shows.ts`).
- Cache em memória de 10 min por query (evita bater no TMDB a cada digitação).
- Gêneros TMDB mapeados para nomes em português.

> Pendência externa: a chave TMDB fornecida foi rejeitada (status 7 "invalid
> key"). O `.env` está comentado à espera de uma válida — nenhuma mudança de
> código necessária.

### `events/` — ciclo de vida do evento

- Estados: `DRAFT → PUBLISHED → CANCELLED`.
- Só evento `PUBLISHED` aparece na busca pública; só `DRAFT` é editável.
- `SEATED` gera os assentos no create (fileiras A–Z × N por fileira, limites
  26×30). `STANDING` só tem `capacity`.
- `GET /events/:id` devolve `availability` ({total, available}).
- `GET /events/:id/seats` devolve o mapa com status FREE/TAKEN por assento.
- `POST /:id/cancel` numa transação: cancela reservas pendentes, invalida
  ingressos VALID e marca o evento CANCELLED.
- **Expiração preguiçosa**: `expireStaleReservations()` roda ao ler mapa,
  criar reserva e pagar — reservas `PENDING` com `expiresAt` vencida são
  canceladas e os assentos liberados. Sem cron job.

### `reservations/` — a anti-venda-dupla (ponto de destaque)

Hold de 10 minutos (`expiresAt`). A criação de reserva assentada acontece em
**uma transação**:

```ts
const reservation = await tx.reservation.create({...});          // 1. cria a reserva
const taken = await tx.seat.updateMany({
  where: { id: { in: seatIds }, eventId, reservationId: null }, // 2. só assentos LIVRES
  data: { reservationId: reservation.id },
});
if (taken.count !== seatIds.length) throw new ConflictException(); // 3. conflito → rollback
```

Por que funciona: o `updateMany` é uma única sentença SQL
(`UPDATE ... WHERE reservation_id IS NULL`). Se dois clientes disputam o
mesmo assento ao mesmo tempo, o Postgres serializa a escrita (row lock no UPDATE) — um deles atualiza
1 linha, o outro 0, e a transação dele faz rollback com **409**. A leitura do
mapa (FREE/TAKEN) é só visual; a garantia é na escrita.

Pista: transação com `aggregate` das quantities `PENDING|CONFIRMED` + checagem
`used + quantity > capacity` → 409 se estourar.

### `payments/` — simulador com semântica Stripe

- `POST /payments/reservations/:id` valida dono, status (`PENDING` apenas).
- Tabela `STRIPE_TEST_DECLINES` (números oficiais de teste → código/mensagem).
- Recusa: grava Payment `DECLINED` e devolve `declineCode` — a reserva
  **continua PENDING** (cliente pode tentar outro cartão até expirar).
- Aprovação: transação (Payment APPROVED + Reservation CONFIRMED) e emissão
  dos ingressos.
- Bandeira detectada por prefixo (4=Visa, 5x=Mastercard, 3x=Amex, 6=Elo).

### `tickets/` — código não forjável

- Emissão **exclusivamente server-side** após pagamento aprovado.
- Código: `ING-XXXXX-XXXXX` gerado com `crypto.randomBytes(10)` mapeado em
  alfabeto sem caracteres ambíguos (sem 0/O/1/I) — ~50 bits de entropia,
  impraticável de adivinhar; único no banco.
- Assentado: 1 ticket por assento com `seatLabel` (ex.: `A1`). Pista: 1 ticket
  com `quantity` (ex.: 3 pessoas).
- `GET /tickets/code/:code` é `@Public()` — alimenta a página de
  compartilhamento `/t/:code` (o link que o QR contém).

### `gate/` — portaria com 3 respostas e anti-revalidação

Retornos possíveis (`CheckInResult`):

| status | reason | quando |
| --- | --- | --- |
| `VALID` | — | marcado USED + checkedInAt, libera entrada |
| `ALREADY_USED` | — | segunda leitura, mostra data/hora do 1º check-in |
| `INVALID` | `NOT_FOUND` | código não existe |
| `INVALID` | `WRONG_EVENT` | ingresso de outro evento (mensagem diz de qual) |
| `INVALID` | `CANCELLED` | evento cancelado |

**Anti-revalidação atômica** (corrigido na auditoria final — vale mencionar):

```ts
const claimed = await this.prisma.ticket.updateMany({
  where: { id: ticket.id, status: 'VALID' },  // só vira USED se ainda é VALID
  data: { status: 'USED', checkedInAt: new Date() },
});
if (claimed.count === 0) return ALREADY_USED;
```

Leitura → update não-atomico teria race: duas leituras simultâneas ambas
veriam `VALID`. Com o `updateMany` condicional, a segunda escrita afeta 0
linhas. **Testado com 2 threads simultâneas: exatamente uma libera.**

Permissões: papel `GATE` valida qualquer evento publicado; organizador valida
os próprios; cliente 403.

O código aceito na entrada é normalizado (`normalizeTicketCode`): aceita
`ING-xxx-xxx`, o link completo `.../t/ING-xxx-xxx` (o que a câmera lê do QR) e
minúsculas.

### `main.ts` / `app.module.ts`

- Prefixo global `/api` + CORS + `ValidationPipe` global (whitelist + transform).
- Guards registrados como `APP_GUARD` (aplicam a tudo sem repetir decorator).

---

## Frontend — página a página

### Fundação

- `api/client.ts` — axios com baseURL `/api` (proxy do Vite) + interceptor que
  injeta o JWT do localStorage. `apiErrorMessage` normaliza erros do Nest
  (message pode ser string ou array do class-validator).
- `api/types.ts` — espelha os contratos do backend.
- `auth/AuthContext.tsx` — login/register/logout, hidrata o usuário do token
  salvo no boot (`GET /auth/me`), token invalidado → limpa storage.
- `main.tsx` — QueryClientProvider (react-query) > BrowserRouter > AuthProvider
  > App. (O AuthProvider fora do App é lição de bug: usar `useAuth` no Layout
  com provider não montado estoura.)
- `App.tsx` — rotas com `RequireRole` por papel:
  - público: `/`, `/entrar`, `/eventos/:id`, `/t/:code`
  - `CUSTOMER`: `/ingressos`, `/checkout/:reservationId`
  - `ORGANIZER`: `/organizador*`
  - `ORGANIZER|GATE`: `/portaria*`
- `GateCheckPage` é `lazy()` — html5-qrcode pesa ~370kB e só importa na portaria.

### Design system — NeoBrutalism (kit oficial)

Instalado via shadcn CLI do registry `neobrutalism.com` (variante Base UI):
Button, Card, Badge, Input, Textarea, Label, Alert, Table, Separator, Tabs em
`src/components/ui/`. Tema oficial em `index.css`: fundo `#fff7e8`, primary
`#ffdc58` (amarelo), bordas pretas 2px, `--radius: 0`, sombras duras
(`4px 4px 0 0 #000`). Fontes: Archivo Black (títulos) + Space Grotesk (corpo).

Duas pegadinhas do Base UI que geraram bugs reais (bom para explicar):

1. `Button render={<Link/>}` vira `<a>` — precisa `nativeButton={false}`
   senão o Base UI reclama e a semântica quebra.
2. O Button do Base UI seta `type="button"` internamente — botão de submit de
   formulário **precisa** de `type="submit"` explícito, senão o form não dispara.

### Páginas

- **ExplorePage** — busca por título/casa/cidade, filtros de categoria,
  paginação (react-query com `keepPreviousData`).
- **EventDetailPage** — detalhe + disponibilidade; carrega `SeatMapPicker`
  (SEATED) ou stepper de quantidade (STANDING). Reserva → navega ao checkout.
  Não logado → `/entrar` com `state.from` para voltar depois.
- **CheckoutPage** — resumo + form de cartão; badge de countdown (expira em X
  min); recusa mostra `declineCode` da "Stripe"; sucesso → `/ingressos` com os
  ingressos novos destacados.
- **MyTicketsPage** — cards estilo ingresso físico (picote tracejado + recortes
  circulares + QR emoldurado + pseudo-código de barras). Copiar link /
  abrir ingresso.
- **TicketSharePage** — página pública do ingresso (o conteúdo do QR): dados
  do evento, lugar/quantidade, status com QR (cinza se USED/CANCELLED) e botão
  de compartilhar (Web Share API com fallback clipboard).
- **OrganizerEventsPage** — tabela de eventos com vendidos, status e ações
  (publicar/editar/cancelar/portaria).
- **OrganizerEventFormPage** — passo 1: catálogo (TMDB ou shows, com busca);
  passo 2: dados do evento (local, data, preço, formato SEATED/STANDING com
  fileiras×assentos ou capacidade).
- **GateEventsPage / GateCheckPage** — seleção de evento; leitor de câmera
  (html5-qrcode, para ao ler e valida) + digitação manual; resultado como
  Alert verde/amarelo/vermelho com dados do ingresso.

---

## Decisões de arquitetura (porquês)

1. **Por que NestJS + módulos por domínio?** Espelha o domínio (auth, catalog,
   events, reservations, payments, tickets, gate); cada um tem DTO, service,
   controller e module — fácil navegar e testar.
2. **Por que PostgreSQL + Prisma?** Banco relacional de verdade (transações ACID, locks de linha); migrations reais
   (histórico de schema versionado); trocar para Postgres = mudar 1 linha.
3. **Por que expiração preguiçosa e não cron?** Simples e suficiente: toda
   operação sensível varre reservas vencidas. Custo O(pending) e sem
   infraestrutura extra.
4. **Por que o QR contém o link e não o código puro?** O mesmo QR funciona em
   qualquer leitor, abre a página do ingresso e ainda é aceito pela portaria
   (que extrai o código do link). Compartilhar = compartilhar o link.
5. **Por que atualização condicional em vez de lock?** `UPDATE ... WHERE` é
   atômico no banco — não depende de timing da aplicação e escala para qualquer
   banco relacional.
6. **Por que holds de 10 min no servidor?** O cliente não decide prazo; o
   servidor cancela o que venceu, evitando assentos presos para sempre.

## Testes executados (evidências para citar)

- E2E via API (script Python): busca → reserva assentada → recusa Stripe
  (`insufficient_funds`) → aprovação `4242` → ingresso público → portaria
  valida → revalida (ALREADY_USED) → código inexistente (NOT_FOUND) → ingresso
  de pista → ingresso de evento errado (WRONG_EVENT).
- **Concorrência**: 2 validações simultâneas do mesmo ingresso → exatamente
  1 `VALID` + 1 `ALREADY_USED`.
- **Conflito de assento**: reservar o mesmo assento 2× → 409.
- Builds: `nest build` e `tsc -b && vite build` sem erros.

## Limitações conhecidas (honestidade em entrevista)

- Chave TMDB fornecida foi rejeitada — sistema roda no fallback local até
  entrar chave válida (nenhuma mudança de código).
- JWT sem refresh token; logout é client-side (limpa storage).
- Pagamento é simulado (sem chamada real à Stripe) — os números/códigos de
  teste é que seguem o padrão deles.
- Registro de papel é aberto (qualquer um cria conta GATE) — em produção,
  portaria seria convidada pelo organizador.
- Sem testes automatizados de unidade/E2E no repo (validação foi por scripts).
