# Ingressa

Plataforma de eventos e ingressos: organizadores publicam eventos a partir de um catálogo externo
(filmes via TMDB + shows), clientes reservam lugares, pagam (simulado), recebem ingresso com QR Code
e a portaria valida a entrada.

## Stack

| Camada  | Tecnologia                                  |
| ------- | ------------------------------------------- |
| Frontend| React + Vite + TypeScript + Tailwind CSS    |
| Backend | NestJS + TypeScript + Prisma + SQLite       |
| Catálogo| TMDB API (filmes) + catálogo de shows local |

## Estrutura

```
ingressa/
├── backend/    # API NestJS (auth, catálogo, eventos, reservas, pagamentos, ingressos, portaria)
└── frontend/   # SPA React (navegação, reserva, checkout, meus ingressos, portaria)
```

## Como rodar

> Requisitos: Node.js 20+ e npm.

```bash
npm run install:all

# backend (http://localhost:3000)
npm run dev:api

# frontend (http://localhost:5173)
npm run dev:web
```

## Funcionalidades

- [ ] Autenticação com papéis (organizador, cliente)
- [ ] Catálogo externo (filmes TMDB + shows mockados)
- [ ] Criação e gerenciamento de eventos pelo organizador
- [ ] Navegação e busca por eventos publicados
- [ ] Reserva com mapa de assentos (cinema/teatro) ou quantidade (pista)
- [ ] Pagamento simulado (confirmação e recusa)
- [ ] Meus ingressos com QR Code e compartilhamento por link
- [ ] Portaria: leitura de QR pela câmera + digitação manual
