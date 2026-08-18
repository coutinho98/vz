# VZ

Plataforma de eventos e ingressos: organizadores publicam eventos a partir de um catálogo
externo (filmes via TMDB + shows locais), clientes reservam assentos ou pista, pagam de
forma simulada e recebem ingressos com QR Code; a portaria valida a entrada com câmera
ou digitação manual.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind (kit NeoBrutalism)
- **Backend**: NestJS + Prisma + PostgreSQL
- **Extras**: Redis (opcional, locks de assento e tempo real via SSE) e TMDB para o catálogo de filmes

## Como rodar

### Docker

```bash
docker compose up --build
# api:   http://localhost:3000
# web:   http://localhost:5173
docker compose exec api npx tsx prisma/seed.ts   # dados de demonstração (uma vez)
```

### Local

> Requisitos: Node 20+, PostgreSQL 16 em `localhost:5432`. Redis é opcional.

```bash
sudo -u postgres psql -c "CREATE USER vz WITH PASSWORD 'vz' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE vz OWNER vz;"

npm run install:all
cp backend/.env.example backend/.env   # TMDB_API_KEY e REDIS_URL são opcionais

npm --prefix backend run migrate
npm --prefix backend run seed

npm run dev:api   # http://localhost:3000
npm run dev:web   # http://localhost:5173
```

### Contas de demonstração (senha `123456`)

organizador@vz.com, cliente@vz.com, cliente2@vz.com e portaria@vz.com

### Cartões de teste (padrão Stripe)

Aprova: 4242 4242 4242 4242 (ou qualquer outro número válido). Recusam:
4000 0000 0000 0002 (card_declined), ...9995 (saldo insuficiente),
...9987 (cartão perdido), ...0069 (expirado) e ...0127 (CVV incorreto).

## Limitações e observações

- **Chave TMDB**: não está no repositório (enviada separadamente). Sem ela, o
  catálogo usa um fallback local - todo o fluxo funciona, apenas sem os dados
  reais do TMDB.
- **Câmera da portaria**: requer HTTPS ou localhost (regra de `getUserMedia` nos
  navegadores). Em HTTP, use a digitação manual.
- **Redis opcional**: sem `REDIS_URL` todas as garantias se mantêm, mas sem o mapa
  em tempo real e sem a recusa instantânea de assentos.
- **Pagamento simulado**: não há integração real com a Stripe.
- **Registro de papéis aberto**: qualquer um cria conta de qualquer papel; em
  produção, portaria seria por convite do organizador.
- **Sem testes automatizados**: a validação foi feita por scripts contra a API em
  execução (fluxos completos, concorrência de assentos e de check-in).
- **Deploy free (Render)**: cold start de ~30-60s após inatividade.
