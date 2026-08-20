# 🎬 Roteiro de Gravação de Vídeo — Apresentação Técnica do Ingressa (VZ)
> **Perfil**: Desenvolvedor(a) Fullstack Júnior  
> **Tempo estimado de vídeo**: 8 a 10 minutos  
> **Objetivo**: Demonstrar domínio prático do projeto, comunicação clara e domínio das decisões arquiteturais mais sofisticadas (concorrência, Redis + SSE, integridade relacional e segurança).

---

## 📋 1. Preparação Pré-Gravação (Setup da Máquina)

Antes de iniciar a gravação, deixe tudo preparado para não perder tempo com telas carregando ou erros de digitação:

### 🛠️ 1. Serviços e Terminais
```bash
# 1. Certifique-se de que o banco e redis estão rodando (local ou Docker)
docker compose up -d

# 2. Em um terminal: Backend
npm run dev:api    # http://localhost:3000

# 3. Em outro terminal: Frontend
npm run dev:web    # http://localhost:5173
```

### 🖥️ 2. Organização das Janelas de Gravação
1. **Navegador 1 (Esquerda - Janela Principal)**: 
   - Aba 1: `http://localhost:5173` (logado como `cliente@vz.com` ou deslogado na home).
   - Aba 2: `http://localhost:5173/login` (para trocar para `organizador@vz.com` ou `portaria@vz.com`).
2. **Navegador 2 (Direita - Janela Anônima / Outro Navegador)**:
   - `http://localhost:5173` (logado como `cliente2@vz.com`).
   - *Finalidade*: Demonstrar a atualização instantânea do mapa de assentos via SSE em tempo real sem refresh.
3. **VS Code (Janela Alternativa - Atalho Alt+Tab)**:
   - Deixe abertos os seguintes arquivos em abas fixadas:
     - [`backend/src/seats/seats-hold.service.ts`](file:///home/shadys/ingressa/backend/src/seats/seats-hold.service.ts) *(Script Lua)*
     - [`backend/src/reservations/reservations.service.ts`](file:///home/shadys/ingressa/backend/src/reservations/reservations.service.ts) *(Transação ACID e expiração)*
     - [`backend/src/seats/seats-stream.controller.ts`](file:///home/shadys/ingressa/backend/src/seats/seats-stream.controller.ts) *(SSE Stream)*
     - [`backend/src/payments/payments.service.ts`](file:///home/shadys/ingressa/backend/src/payments/payments.service.ts) *(Sandbox Stripe)*
     - [`backend/src/tickets/tickets.service.ts`](file:///home/shadys/ingressa/backend/src/tickets/tickets.service.ts) *(CSPRNG Base32)*
     - [`backend/src/gate/gate.service.ts`](file:///home/shadys/ingressa/backend/src/gate/gate.service.ts) *(Check-in atômico)*

### 📝 3. Bloco de Notas / Colar Fácil (Colinha de Testes)
- **Logins (Senha: `123456`)**:
  - Organizador: `organizador@vz.com`
  - Clientes: `cliente@vz.com` | `cliente2@vz.com`
  - Portaria: `portaria@vz.com`
- **Cartões de Teste Stripe**:
  - Sucesso: `4242 4242 4242 4242`
  - Recusa (Saldo): `4000 0000 0000 9995`
  - Recusa (Genérica): `4000 0000 0000 0002`

---

## ⏱️ 2. Tabela de Estrutura do Vídeo

| Bloco | Tempo | Foco Principal | O que mostrar na tela |
| :--- | :--- | :--- | :--- |
| **1. Introdução** | 00:00 - 01:00 | Pitch do projeto, arquitetura monorepo e tech stack | Home da aplicação + Diagrama de arquitetura |
| **2. Organizador & TMDb** | 01:00 - 02:30 | Criação de eventos com catálogo externo, cache e fallback | Formulário do Organizador + TMDb + Código do catálogo |
| **3. O Ponto Alto: Concorrência** | 02:30 - 05:00 | Concorrência de assentos, Script Lua no Redis e SSE | **Tela Dividida (2 clientes)** + Código do Hold/SSE |
| **4. Checkout & Ingressos** | 05:00 - 06:30 | Gateway simulado da Stripe e geração segura de ingressos | Checkout com erro e sucesso + Meus Ingressos (QR Code) |
| **5. Portaria & Validação** | 06:30 - 08:00 | Validação por câmera/manual e proteção anti-duplicação | Tela da Portaria + Teste de entrada + Código SQL atômico |
| **6. Conclusão** | 08:00 - 09:00 | Diferenciais técnicos (degradação graciosa, clean code) | Visão geral do repositório + Encerramento |

---

## 🎙️ 3. Roteiro Detalhado Cena a Cena (Fala & Ação)

---

### 🟢 BLOCO 1: Introdução & Visão Geral (00:00 – 01:00)

#### 🎬 O que mostrar na tela:
- Câmera aberta ou tela compartilhada na **Home do Ingressa (ExplorePage)** com visual Neo-brutalism.
- Mostre rapidamente a rolagem dos cards de filmes e shows, com os filtros de categorias funcionando.

#### 🗣️ O que falar (Sugestão de Script):
> *"Olá! Meu nome é [Seu Nome], e hoje vou apresentar o **Ingressa**, uma plataforma completa de venda, reserva em tempo real e validação de ingressos desenvolvida como teste técnico para a vaga de Fullstack Júnior.*
>
> *O projeto foi construído em arquitetura monorepo moderna:*
> - *No **Backend**, utilizei **NestJS** com **Prisma ORM**, banco de dados relacional **PostgreSQL** e **Redis** para concorrência de alta velocidade e tempo real.*
> - *No **Frontend**, utilizei **React** com **Vite**, **TypeScript**, **Tailwind CSS** com uma identidade visual em **Neo-brutalism**, e **TanStack Query** para gerenciamento de estado assíncrono e cache.*
>
> *A plataforma resolve os desafios de 3 personas essenciais do negócio: o **Organizador**, o **Cliente** e a **Portaria**. Vamos passar por cada um desses fluxos destacando como os requisitos de negócio e os desafios de concorrência foram solucionados no código."*

---

### 🟢 BLOCO 2: Organizador & Integração com Catálogo Externo (01:00 – 02:30)

#### 🎬 O que mostrar na tela:
1. Faça login com `organizador@vz.com` / `123456`.
2. Acesse o **Painel do Organizador** e clique em **"Criar Evento"**.
3. **Passo 1 (Catálogo)**: Digite um filme no campo de busca (ex: *"Duna"* ou *"Batman"*). Mostre os pôsteres e sinopses carregados da API do TMDb. Selecione um item e mostre que o título, descrição e imagem são pré-preenchidos.
4. **Passo 2 (Configuração)**: Mostre a flexibilidade de configurar sessões múltiplas, definir local, preço e escolher entre **Assentos Marcados (SEATED)** ou **Pista (STANDING)**.
5. Crie ou publique o evento.
6. Alterne para o **VS Code** na classe [`backend/src/catalog/catalog.service.ts`](file:///home/shadys/ingressa/backend/src/catalog/catalog.service.ts).

#### 🗣️ O que falar:
> *"No painel do organizador, o fluxo de criação de eventos foi projetado para economizar tempo do usuário integrando a API externa do **TMDb (The Movie Database)**.*
>
> *Aqui no código do `CatalogService`, adotei duas boas práticas cruciais para integrações externas:*
> 1. *Implementei um **cache em memória com TTL de 10 minutos** por termo de busca, evitando chamadas repetitivas e protegendo a aplicação contra rate limits do provedor externo.*
> 2. *Implementei um **fallback gracioso**: se a chave de API não estiver configurada no `.env` ou se houver instabilidade na rede externa, o sistema chaveia automaticamente para um catálogo estático local sem quebrar a experiência do organizador.*
>
> *Além disso, o organizador tem controle total sobre o formato do evento: ele pode criar tanto eventos de pista com limite de lotação quanto eventos com mapa de assentos personalizados de fileiras A até Z."*

---

### 🔥 BLOCO 3: O Ponto Alto — Concorrência, Redis + Lua Script & Tempo Real via SSE (02:30 – 05:00)

> [!IMPORTANT]
> **Momento mais valioso do vídeo**: É aqui que você prova domínio sênior de engenharia de software mesmo disputando uma vaga júnior.

#### 🎬 O que mostrar na tela (Demonstração Prática):
1. **Posicione duas janelas lado a lado**:
   - Janela Esquerda: Cliente 1 (`cliente@vz.com`) acessando o detalhe de um evento com mapa de assentos.
   - Janela Direita: Cliente 2 (`cliente2@vz.com`) acessando exatamente a mesma página do evento.
2. Na janela do **Cliente 1**, clique nos assentos **B3 e B4** e clique em **"Reservar Assentos"**.
3. **Repare na Janela do Cliente 2**: *Instantaneamente, sem recarregar a página (F5)*, os assentos B3 e B4 mudam de cor para **cinza (ocupados)**.
4. Tente selecionar o mesmo assento na Janela do Cliente 2 para mostrar que o sistema bloqueia a ação.
5. Alterne para o **VS Code** e mostre os arquivos:
   - [`backend/src/seats/seats-hold.service.ts`](file:///home/shadys/ingressa/backend/src/seats/seats-hold.service.ts)
   - [`backend/src/reservations/reservations.service.ts`](file:///home/shadys/ingressa/backend/src/reservations/reservations.service.ts)
   - [`backend/src/seats/seats-stream.controller.ts`](file:///home/shadys/ingressa/backend/src/seats/seats-stream.controller.ts)

#### 🗣️ O que falar:
> *"Agora vamos ao ponto alto da arquitetura: **como garantimos que dois clientes nunca comprem o mesmo assento e como o mapa é sincronizado em tempo real**.*
>
> *Para resolver o clássico problema de concorrência (*Race Condition*), estruturei uma **Estratégia de Defesa em Duas Camadas** combinando **Redis** e **PostgreSQL**:*
>
> *1. **Camada 1 — Lock Atômico em Memória com Script Lua no Redis (`HOLD_LUA`)**:*
> *Imagine que dois clientes tentem reservar os assentos A1 e A2 no mesmo segundo. Se o Node.js fizesse consultas comuns separadas (`A1 está livre?`, `A2 está livre?`), haveria uma janela de milissegundos onde outro usuário poderia se intrometer e roubar o A2 no meio do caminho, gerando uma reserva incompleta.*
> *Para impedir isso, usamos um **Script Lua**. Como o Lua roda direto no motor do Redis de forma **atômica** (indivisível), o Redis pausa qualquer outra requisição enquanto roda nosso script.*
> *O script funciona em lógica **Tudo ou Nada (All-or-Nothing)**:*
> - *Primeiro, checa todos os assentos juntos: se **qualquer um** já estiver ocupado, aborta na hora e retorna `0`.*
> - *Se **todos** estiverem livres, ele grava o hold de todos com tempo de 10 minutos (TTL) e retorna `1`.*
> *Isso acontece na memória RAM em menos de **1 milissegundo** com zero viagens extras de rede.*
>
> *2. **Camada 2 — Rede de Segurança ACID no PostgreSQL (Row-Level Lock)**:*
> *Logo após o lock no Redis, abrimos uma transação no PostgreSQL com o Prisma. O pulo do gato está nesta instrução `seat.updateMany`: atualizamos os assentos com a cláusula `reservationId: null`. O Postgres aplica um Row-Level Lock durante o UPDATE. Se a contagem de linhas alteradas for menor que a quantidade pedida, sabemos que houve concorrência simultânea, a transação faz rollback imediato e lança um `HTTP 409 Conflict`.*
>
> *3. **Sincronização em Tempo Real via Server-Sent Events (SSE)**:*
> *Para que os outros usuários vejam a ocupação sem fazer polling constante no banco (o que geraria gargalo), utilizei **SSE** através do endpoint `events/:id/seats/stream`. O backend mantém uma sala por evento com heartbeat a cada 25 segundos. Assim que uma reserva é feita, cancelada ou expira, o `SeatsBroadcastService` emite o evento `seats-updated` e o React Query invalida o cache do mapa instantaneamente.*
>
> *4. **Expiração Automática e Degradação Graciosa**:*
> *Se o cliente fechar o navegador sem pagar, o Redis emite uma **Keyspace Notification** (`__keyevent@0__:expired`), o backend intercepta, limpa o assento no Postgres e avisa via SSE, fazendo o assento voltar a ficar verde (livre) na tela de todo mundo. E se o Redis estiver desligado? A aplicação continua 100% segura apenas no PostgreSQL, com expiração preguiçosa (lazy evaluation)."*

---

### 🟢 BLOCO 4: Checkout, Simulação de Gateway Stripe & Emissão de Ingressos (05:00 – 06:30)

#### 🎬 O que mostrar na tela:
1. Siga para a tela de **Checkout** com a reserva pendente.
2. Destaque o componente **HoldTimer** (contador regressivo de 10 minutos sincronizado com o backend).
3. Teste de Recusa: Preencha com o cartão de teste da Stripe para saldo insuficiente (`4000 0000 0000 9995`). Clique em Pagar.
   - Mostre o alerta de erro amigável na tela (`insufficient_funds`).
   - Destaque que **a reserva continua válida** e o assento não foi perdido.
4. Teste de Sucesso: Altere o cartão para `4242 4242 4242 4242` e confirme o pagamento.
5. Mostre o redirecionamento para a página **"Meus Ingressos" (`MyTicketsPage`)**:
   - Destaque o design do bilhete com picote no estilo Neo-brutalism.
   - Mostre o **QR Code gerado via SVG** e o código no padrão `ING-XXXXX-XXXXX`.
   - Clique no link do QR Code para abrir a página pública de visualização do ingresso (`/t/:code`).
6. Mostre rapidamente no VS Code: [`backend/src/tickets/tickets.service.ts`](file:///home/shadys/ingressa/backend/src/tickets/tickets.service.ts).

#### 🗣️ O que falar:
> *"No checkout, simulei fielmente o ecossistema da **Stripe Sandbox**. O backend reconhece os números oficiais de teste: quando passamos um cartão com erro, ele registra a tentativa, exibe a mensagem amigável da operadora e mantém a reserva pendente para que o cliente tente outro cartão sem perder os assentos selecionados.*
>
> *Ao aprovar o pagamento, os ingressos são emitidos exclusivamente pelo backend:*
> - *Não usamos IDs previsíveis nem sequenciais. A função `generateTicketCode` utiliza o gerador seguro `crypto.randomBytes(10)` mapeado em um alfabeto Base32 livre de caracteres visualmente ambíguos (como `0/O` e `1/I`).*
> - *Isso gera um código como `ING-7H9KD-2X4PL` com **cerca de 50 bits de entropia CSPRNG**, tornando qualquer ataque de força bruta computacionalmente impossível.*
> - *O QR Code aponta para o link canônico do ingresso, permitindo compartilhamento público sanitizado (sem expor e-mail ou dados de cartão do comprador)."*

---

### 🟢 BLOCO 5: Portaria (Gate Check-In) & Prevenção Anti-Validação Dupla (06:30 – 08:00)

#### 🎬 O que mostrar na tela:
1. Faça logout e login como `portaria@vz.com` / `123456`.
2. Acesse a tela de validação do evento correspondente (`GateCheckPage`).
3. **Cenário 1 (Entrada Válida)**:
   - Ative a câmera ou cole o link/código do ingresso emitido no bloco anterior.
   - Clique em **"Validar Entrada"**.
   - Mostre o card de sucesso em **Verde vibrante**: *"Entrada Liberada · Assento B3 · Titular: Cliente"*.
4. **Cenário 2 (Tentativa de Fraude / Reutilização)**:
   - Clique em validar novamente o mesmo código.
   - Mostre o alerta em **Amarelo**: *"Ingresso já utilizado em [data e hora exata]"*.
5. **Cenário 3 (Evento Errado)**:
   - Cole um código de outro evento ou um código inválido para demonstrar o retorno em **Vermelho**.
6. Alterne para o **VS Code** na classe [`backend/src/gate/gate.service.ts`](file:///home/shadys/ingressa/backend/src/gate/gate.service.ts).

#### 🗣️ O que falar:
> *"Na portaria, temos outro desafio crítico de concorrência: **impedir que duas catracas liberem o mesmo print de QR Code no mesmo segundo**.*
>
> *Se fizéssemos uma consulta simples seguida de um update, haveria uma brecha de milissegundos onde ambas as catracas veriam o status `VALID`. Para eliminar esse risco, implementei um **UPDATE atômico condicional no PostgreSQL**:*
>
> ```typescript
> const claimed = await this.prisma.ticket.updateMany({
>   where: { id: ticket.id, status: 'VALID' },
>   data: { status: 'USED', checkedInAt: new Date() },
> });
> ```
>
> *O próprio motor do banco serializa a escrita: exatamente uma catraca atualiza 1 linha e recebe a confirmação verde; a outra atualiza 0 linhas e é imediatamente notificada com o horário em que o ingresso já foi utilizado.*
>
> *Na interface, integrei a biblioteca `html5-qrcode` com carregamento sob demanda (lazy loading) e uma função de normalização que aceita tanto a leitura da câmera quanto o código digitado ou a URL completa copiada."*

---

### 🟢 BLOCO 6: Conclusão & Diferenciais Técnicos (08:00 – 09:00)

#### 🎬 O que mostrar na tela:
- Tela com o repositório no GitHub ou visão geral da estrutura de pastas do projeto no VS Code.

#### 🗣️ O que falar:
> *"Para finalizar, gostaria de destacar os principais diferenciais que apliquei neste projeto:*
> 1. ***Segurança e Autorização em Camadas**: Autenticação JWT com Guards globais no NestJS e controle de acesso estrito por papéis (`ORGANIZER`, `CUSTOMER` e `GATE`).*
> 2. ***Resiliência e Degradação Graciosa**: O sistema opera perfeitamente com ou sem Redis, e com ou sem a chave de API do TMDb.*
> 3. ***Concorrência Robusta**: Tratamento de race conditions em todas as etapas críticas — da reserva do assento à validação na catraca.*
> 4. ***Experiência do Usuário (UX/UI)**: Interface fluida em React com Neo-brutalism, tratamento de estados de loading/erro com TanStack Query e feedback em tempo real com SSE.*
>
> *Agradeço muito a oportunidade de apresentar este teste técnico e fico à disposição para tirar qualquer dúvida sobre a implementação ou a arquitetura. Muito obrigado!"*

---

## 🎯 4. Dicas de Ouro para a Gravação do Vídeo

1. **Ritmo e Entonação**: Fale de forma pausada e confiante. Você não precisa correr; o roteiro é direto ao ponto.
2. **Qualidade de Áudio**: Use fone com microfone próximo à boca e evite ruídos no ambiente.
3. **Não se desculpe por ser Júnior**: Evite frases como *"eu não sabia fazer, mas tentei"*. Use frases afirmativas: *"Tomei a decisão de arquitetura X para resolver o problema Y"*.
4. **Resolução de Tela**: Grave em **1080p (1920x1080)**. Aumente o zoom do navegador para **110%** e a fonte do VS Code para **16px** para que o código fique perfeitamente legível no vídeo.
5. **Software Recomendado**: **OBS Studio** ou **Loom** (compartilhando a tela inteira para alternar facilmente entre os navegadores e o VS Code).
