# Ingressa

Plataforma de eventos e ingressos: organizadores montam eventos a partir de um catálogo
externo (filmes via TMDB + shows locais), clientes reservam lugares — assentos marcados
ou pista —, pagam de forma simulada, recebem ingresso com QR Code compartilhável por link
e a portaria valida a entrada com câmera ou digitação manual.

## Stack

| Camada   | Tecnologia                               |
| -------- | ---------------------------------------- |
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 + NeoBrutalism kit |
| Backend  | NestJS 11 + TypeScript + Prisma 7 + PostgreSQL 16 |
| Catálogo | [TMDB](https://www.themoviedb.org/) (filmes) + catálogo de shows local |

## Estrutura

```
ingressa/
├── backend/
│   └── src/
│       ├── auth/          # JWT, papéis (organizador/cliente), guards
│       ├── catalog/       # TMDB com fallback offline + shows locais
│       ├── events/        # CRUD, publicação, mapa de assentos, disponibilidade
│       ├── reservations/  # bloqueio atômico de assentos/pista (hold de 10 min)
│       ├── payments/      # pagamento simulado (aprovação e recusa)
│       ├── tickets/       # emissão, código único, consulta pública p/ link
│       └── gate/          # validação na portaria (válido/inválido/já usado/evento errado)
└── frontend/
    └── src/
        ├── api/           # cliente axios + tipos do domínio
        ├── auth/          # contexto de autenticação
        ├── components/    # layout, cards, mapa de assentos, UI kit
        └── pages/         # explorar, detalhe, checkout, ingressos, organizador, portaria
```

## Como rodar

### Opção 1 — Docker (tudo em containers)

```bash
docker compose up --build
# api:    http://localhost:3000
# web:    http://localhost:5173
# banco:  localhost:5432 (postgres 16)

# popular o banco com dados de demonstração (uma vez):
docker compose exec api npx tsx prisma/seed.ts
```

### Opção 2 — Local (Postgres nativo)

> Requisitos: Node.js 20+, npm e PostgreSQL 16 rodando em `localhost:5432`.

```bash
# 1. banco (uma vez)
sudo -u postgres psql -c "CREATE USER ingressa WITH PASSWORD 'ingressa' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE ingressa OWNER ingressa;"

# 2. dependências
npm run install:all

# 3. configurar o backend
cp backend/.env.example backend/.env   # ajuste TMDB_API_KEY se quiser catálogo real (opcional)

# 4. migrations + seed
npm --prefix backend run migrate
npm --prefix backend run seed

# 5. subir as aplicações (terminais separados)
npm run dev:api    # http://localhost:3000
npm run dev:web    # http://localhost:5173 (proxy /api -> :3000)
```

### Contas de demonstração (seed)

| Papel       | E-mail                     | Senha   |
| ----------- | -------------------------- | ------- |
| Organizador | organizador@ingressa.com   | 123456  |
| Cliente     | cliente@ingressa.com       | 123456  |

## Fluxos implementados

### Organizador
- Cria eventos a partir do catálogo (filmes TMDB *em cartaz*/busca ou shows locais),
  definindo data, local, preço e formato do espaço.
- Espaços **assentados** (cinema/teatro: fileiras × assentos, com mapa) ou **pista**
  (capacidade total).
- Gerencia eventos: publicar (rascunho → publicado), cancelar (libera pendências e
  invalida ingressos), editar rascunhos.
- Portaria própria por evento.

### Cliente
- Navega e busca eventos publicados (título, casa ou cidade), filtrando por categoria.
- Reserva com **mapa de assentos** interativo ou **quantidade** (pista, até 10).
  A reserva bloqueia os lugares por **10 minutos** (expiração automática no servidor).
- **Pagamento simulado**: qualquer cartão é aprovado; números terminados em `0002`
  são recusados e a reserva continua válida para nova tentativa.
- **Meus ingressos** com QR Code (conteúdo = link público `/t/CODIGO`),
  compartilhável por link, com estado (válido/utilizado/cancelado).

### Portaria (organizador)
- Validação com **retorno claro e colorido**:
  - ✅ **Válido** — entrada liberada (marca como utilizado);
  - ⚠️ **Já utilizado** — com data/hora do check-in;
  - ❌ **Inválido** — código inexistente, **evento errado** (informa o evento correto)
    ou cancelado.
- Leitura do QR **pela câmera** (html5-qrcode, aceita o link ou o código puro) +
  **digitação manual** como alternativa.

## Decisões técnicas

- **Concorrência de assentos**: reserva dentro de transação com `updateMany` condicional
  (`reservationId IS NULL`) — dois clientes disputando o mesmo lugar recebem `409`.
- **Expiração de reservas**: varredura preguiçosa (`expireStaleReservations`) ao ler
  mapa/criar reserva/pagar — sem necessidade de cron.
- **TMDB opcional**: sem `TMDB_API_KEY` a API usa catálogo local de fallback, mantendo o
  fluxo completo funcionando offline.
- **QR Code**: o backend emite apenas o código (`ING-XXXXX-XXXXX`); o QR é renderizado no
  front (`qrcode.react`) apontando para o link público do ingresso — o mesmo QR funciona
  em qualquer leitor.
- **IDs UUID** para validação de rota via `ParseUUIDPipe`.

## Scripts úteis

```bash
npm run build:api && npm run build:web   # builds de produção
npm --prefix backend run seed            # reseta e popula o banco
npm --prefix backend run start:prod      # API via dist
```
