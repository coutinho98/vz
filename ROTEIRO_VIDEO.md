# 🎬 Roteiro de Vídeo — Apresentação do Ingressa (VZ)

> **Duração alvo**: 7 a 9 minutos
> **Tom**: descontraído, confiante, sem robótica. É uma conversa, não uma defesa de tese.
> **Regra de ouro**: cada fala abaixo tem no máximo 3 frases. Se você precisar respirar no meio, corte algo.

---

## 📋 1. Antes de apertar o REC

### Serviços no ar

```bash
docker compose up -d          # banco + redis
npm run dev:api               # http://localhost:3000
npm run dev:web               # http://localhost:5173
```

### Janelas organizadas

| Janela | O quê | Por quê |
| :--- | :--- | :--- |
| Navegador principal | Home + login `maria@vz.com` | Fluxo do cliente |
| Navegador anônimo | Logado `joao@vz.com` | Provar tempo real (SSE) na tela dividida |
| VS Code | Abas fixadas: `seats-hold.service.ts`, `reservations.service.ts`, `gate.service.ts`, `tickets.service.ts` | Mostrar código sem procurar arquivo na hora |

### Colinha (Bloco de Notas)

```
LOGINS (senha 123456)
marina@vz.com  → organizadora
maria@vz.com   → cliente 1
joao@vz.com    → cliente 2
paulo@vz.com   → portaria

CARTÕES
4242 4242 4242 4242        → aprova
4000 0000 0000 9995        → saldo insuficiente
4000 0000 0000 0002        → recusada
```

---

## ⏱️ 2. Mapa do vídeo

| # | Bloco | Tempo | Manchete |
| :--- | :--- | :--- | :--- |
| 1 | Abertura | 00:00 – 00:45 | "O problema que eu resolvi" |
| 2 | Organizadora + TMDB | 00:45 – 02:00 | "Criar evento em 30 segundos" |
| 3 | Cliente: assentos ao vivo | 02:00 – 04:00 | "Dois caras, um assento, zero bug" ⭐ |
| 4 | Checkout + Pix/Boleto/Cartão | 04:00 – 05:30 | "Pagamento com direito a erro" |
| 5 | Ingresso + QR Code | 05:30 – 06:15 | "O bilhete que não se forja" |
| 6 | Portaria | 06:15 – 07:45 | "O print do grupo não passa aqui" |
| 7 | Fechamento | 07:45 – 08:30 | "O que eu faria diferente" |

---

## 🎙️ 3. Roteiro cena a cena

### 🟢 BLOCO 1 — Abertura (00:00 – 00:45)

**Tela**: Home do app, rolando os cards de filmes e shows.

> *"Oi! Eu sou o [nome], e esse é o Ingressa — uma plataforma de venda de ingressos que eu construí do zero: catálogo, reserva de assentos em tempo real, pagamento e validação na portaria.*
>
> *Stack: React e Tailwind na frente, NestJS, PostgreSQL e Redis atrás. Mas o legal não é a stack — é o que acontece quando duas pessoas clicam no mesmo assento no mesmo segundo. Vamos ver isso."*

💡 *Dica: não apresente a stack em lista. Fale como quem apresenta um filme: problema primeiro, elenco depois.*

---

### 🟢 BLOCO 2 — Organizadora + catálogo TMDB (00:45 – 02:00)

**Tela**: Login `marina@vz.com` → "Criar evento" → buscar "Duna" no catálogo → selecionar → configurar sessões, sala e preço → publicar.

> *"A Marina é organizadora. Ela busca um filme e o catálogo já traz pôster, título e sinopse direto da API do TMDB — ela não digita nada duas vezes.*
>
> *Dois detalhes de engenharia aqui: as buscas têm cache de 10 minutos pra não tomar rate limit do TMDB, e se a API cair ou a chave não existir, o sistema cai num catálogo local sem quebrar nada.*
>
> *Ela define sala — Sala 1, IMAX, o que for —, o mapa de assentos e o preço. Trinta segundos e o evento está no ar."*

💡 *Se o TMDB estiver sem chave no dia, mostre o fallback funcionando — virou demonstração de resiliência, não bug.*

---

### 🔥 BLOCO 3 — Concorrência: dois clientes, um assento (02:00 – 04:00)

**Tela**: Duas janelas lado a lado (maria e joao) no mesmo evento com mapa de assentos.

**Ação**:
1. Maria seleciona B3 e B4 → reserva.
2. Corta pro joão: os assentos ficaram **cinza na hora**, sem F5.
3. João tenta clicar num ocupado → bloqueado.
4. VS Code: `seats-hold.service.ts` (script Lua) → `reservations.service.ts` (transação).

> *"Agora o momento que eu mais gosto. A Maria reserva B3 e B4... e na tela do João os assentos já ficaram cinza. Sem refresh, sem polling — é SSE, Server-Sent Events.*
>
> *Mas o problema de verdade é outro: e se os dois clicarem no MESMO assento no mesmo milissegundo? Meu sistema resolve em duas camadas.*
>
> *Camada um: um script Lua roda dentro do Redis. O Redis executa Lua de forma atômica — nada entra no meio. O script olha TODOS os assentos pedidos de uma vez: se qualquer um estiver ocupado, aborta tudo; se todos estiverem livres, trava todos com um timer de 10 minutos. Tudo-ou-nada, em menos de um milissegundo.*
>
> *Camada dois, a rede de segurança: o Postgres. A reserva só é confirmada num UPDATE condicional — se o número de linhas alteradas não bater, é rollback e HTTP 409.*
>
> *E se o cliente sumir sem pagar? O Redis expira a chave, o backend escuta a expiração e o assento volta a ficar verde na tela de todo mundo. Sozinho."*

💡 *Esse é o bloco que separa júnior de pleno. Ensaie ele duas vezes. Se a internet do Redis cair na demo, é degradação graciosa — mostre que continua seguro só no Postgres.*

---

### 🟢 BLOCO 4 — Checkout com direito ao erro (04:00 – 05:30)

**Tela**: Continuação do fluxo da Maria → checkout → tentar cartão recusado → corrigir → aprovar. Depois mostrar Pix e boleto.

**Ação**:
1. Destacar o timer regressivo sincronizado com o backend.
2. Pagar com `4000 0000 0000 9995` → erro "saldo insuficiente" → **reserva continua viva**.
3. Pagar com `4242 4242 4242 4242` → aprovado.
4. Se der tempo: reservar outro ingresso e mostrar Pix (QR) e boleto (linha digitável).

> *"Checkout. Repare no contador: 10 minutos, sincronizado com o servidor — não é um timer bonitinho no navegador, é o mesmo relógio do hold.*
>
> *Agora o erro de propósito: cartão sem saldo. O gateway simulado reconhece os números de teste oficiais da Stripe... e o ponto importante: a tentativa é registrada, mas a reserva continua lá. O cliente troca o cartão e segue — não perde o assento por causa de um recuso.*
>
> *Aprovado. E também tem Pix e boleto — cada um gera seu instrumento de pagamento, QR e linha digitável, como num gateway de verdade."*

---

### 🟢 BLOCO 5 — O ingresso (05:30 – 06:15)

**Tela**: Meus Ingressos → bilhete com QR → abrir link público `/t/:code` (aba nova ou celular).

> *"Ingresso na mão. Parece um bilhete de cinema de verdade porque essa era a ideia — picote, código de barras, tudo ali.*
>
> *O QR aponta pra um link público com dados sanitizados: evento, sala, assento, titular. Nada de e-mail ou número de cartão.*
>
> *E o código não é sequencial, não dá pra adivinhar: são 50 bits de entropia de um gerador criptográfico, num alfabeto sem caracteres ambíguos — zero não vira O, um não vira I. Força bruta aqui é perda de tempo."*

**Tela**: VS Code em `tickets.service.ts` por 5 segundos no máximo.

---

### 🟢 BLOCO 6 — Portaria: o print não passa (06:15 – 07:45)

**Tela**: Login `paulo@vz.com` → novo dashboard da portaria (busca, filtros "Hoje/Próximos/Encerrados") → abrir o evento do ingresso que a Maria comprou.

**Ação**:
1. Mostrar o dashboard filtrando "Hoje".
2. Validar por câmera (ou colar o código) → **VERDE: entrada liberada**.
3. Validar o MESMO código de novo → **AMARELO: já utilizado, com hora exata**.
4. Colar um código de outro evento → **VERMELHO: evento errado**.

> *"Do outro lado da catraca, o Paulo. O dashboard da portaria mostra o que acontece hoje, o que vem e o que já acabou — na correria do evento, ninguém tem tempo de procurar numa lista.*
>
> *Agora o clássico: alguém manda o print do ingresso no grupo e duas pessoas apresentam o mesmo QR no mesmo segundo. Meu update é condicional e atômico: o banco só transforma VALID em USED uma vez. Quem chegou primeiro entra; quem chegou depois recebe o horário exato do uso. Sem empate.*
>
> *E a câmera funciona no celular, com HTTPS, com fallback pra digitação manual — porque dia de show, rede boa é luxo."*

💡 *Se gravar com celular mostrando o QR na tela do computador, teste antes o enquadramento. Se a câmera falhar, a digitação manual É parte do design, não plano B vergonhoso.*

---

### 🟢 BLOCO 7 — Fechamento (07:45 – 08:30)

**Tela**: Repositório no GitHub (README com tabelas de contas demo) ou visão geral das pastas.

> *"Pra fechar, o que eu faria de próximo: testes automatizados — hoje a validação foi por scripts contra a API rodando; e convite de portaria pelo organizador, hoje o registro é aberto.*
>
> *O projeto está no README com tudo pra rodar: docker compose up e pronto. Obrigado pela atenção — e se quiser me ver quebrando a concorrência de novo, é só chamar."*

*(ajuste a última frase pro seu estilo — humor opcional, personalidade obrigatória)*

---

## 🎯 4. Dicas de ouro

1. **Fale 10% mais devagar do que acha que precisa.** Nervoso acelera; o vídeo tem editor, mas não milagre.
2. **Áudio é rei.** Fone com microfone perto da boca, ventilador desligado, porta fechada.
3. **Errou? Repita o treito inteiro e corte na edição** — não corrija no meio da fala ("quer dizer... na verdade...").
4. **Zoom do navegador em 110%, fonte do VS Code 16px+** — se o avaliador precisar pausar pra ler, a fonte está pequena.
5. **Nunca se desculpe.** Não existe "eu não consegui fazer X". Existe "o sistema faz Y; X ficaria num próximo passo".
6. **Grave o Bloco 3 primeiro** (ensaio técnico), mesmo que ele fique no meio do vídeo. Se o SSE falhar, você descobre antes.
7. **Duração**: 8 minutos ótimos > 12 minutos completos. Corta o Boletos antes de cortar a concorrência.
