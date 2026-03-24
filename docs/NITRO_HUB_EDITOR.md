# Nitro Hub Editor — Guia funcional e conceitual

## Introdução

O **Nitro Hub Editor** é um hub web voltado ao time de edição e à gestão operacional. Reúne em um único lugar o cadastro de editores e parâmetros de negócio, o registro de entregas (VSL e criativos), validações e bônus Manuais, acompanhamento de qualidade por leva, fechamento financeiro mensal e uma visão analítica de performance, com controle de acesso via usuários do sistema.

**Público-alvo:** gestores e equipe de operação que precisam registrar entregas, conferir KPIs, consolidar pagamentos e analisar custo e produtividade do setor.

## Objetivos do produto

- Centralizar o cadastro de **editores** e parâmetros (valores por tipo de entrega, taxas de criativos, usuários).
- Registrar **entregas VSL** (com tipos, KPIs, tiers e bônus) e **entregas de criativos** (ADs), com vínculo a editores e rateio quando houver múltiplos participantes.
- Oferecer **validações** e fluxo de **bônus manuais** alinhados a AD e VSL (incluindo Squad Troca e Lead/ML), com regras de unicidade de nomenclatura.
- Medir **qualidade por leva** (lotes, itens por projeto/leva/formato, acurácia e bônus de qualidade).
- Permitir **fechamento mensal** consolidado (salário, bônus rateados, ADs, qualidade), com snapshot do período, histórico e exportação para planilha.
- Expor **performance** com filtros, KPIs, gráficos e rankings de custo do setor.
- Garantir **acesso autenticado** (JWT) e gestão de usuários em Configurações.

## Arquitetura técnica (resumo)

- **Frontend:** React, Vite, TypeScript, React Router (SPA).
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Autenticação:** JWT enviado nas requisições protegidas (header `Authorization: Bearer`).
- **CORS** configurado no servidor para o origin do frontend em desenvolvimento.
- **Variáveis de ambiente:** `DATABASE_URL`, `JWT_SECRET` no backend; `VITE_API_URL` no frontend. Detalhes de cópia de `.env` e comandos estão no `README.md` da raiz do repositório.

## Autenticação e usuários

- **Login:** rota da API `POST /auth/login`; na aplicação, fluxo de login leva à sessão autenticada com token armazenado no cliente.
- **Sessão:** o token JWT valida identidade nas rotas protegidas; `GET /auth/me` retorna o usuário corrente quando o token é válido.
- **Cadastro de usuários:** realizado em **Configurações**, aba **Usuários**. O modelo atual trata tipo de usuário de forma única, sem perfis granulares (por exemplo, “admin” vs “editor” com regras distintas de tela).
- **API:** `GET /users` e `POST /users` exigem autenticação. No login, o e-mail costuma ser **normalizado** (trim e lowercase) para consistência com o cadastro.

## Navegação da aplicação

Rotas principais (alinhadas a `frontend/src/App.tsx`):

| Rota | Conteúdo |
|------|----------|
| `/` | **Entregas** — abas para VSL e Criativos (ADs) |
| `/validacoes` | **Validações** — bônus manuais e conferências |
| `/fechamento` | **Fechamento** do mês corrente |
| `/fechamento/historico` | **Histórico** de períodos fechados |
| `/performance` | **Performance** — análise e gráficos |

A **barra lateral** organiza o acesso por áreas conceituais, por exemplo: **Principal**, **Operação**, **Qualidade**, **Financeiro** e **Gestão**, refletindo o agrupamento de páginas e fluxos no código.

## Módulo Entregas (VSL)

- **Tipos de entrega:** incluem VSL, Lead, ML (mini lead), Troca e Upsell, conforme o enum de tipo no backend.
- **KPIs e resumo:** métricas como retrabalho, qualidade, prazo e total de KPI alimentam tiers e bônus; a tela oferece resumo e filtros por período e editores.
- **Múltiplos editores:** uma entrega pode ter vários editores vinculados; o **bônus** é **rateado** entre eles de forma proporcional.
- **Valores base:** podem vir da tabela de taxas (`DeliveryRate`) com snapshot no momento do cálculo, ou serem ajustados manualmente quando o modelo permitir (`isManualValue`/`baseValueSnapshot`).
- **Mês fechado:** operações que alteram entregas no mês correspondente podem ser bloqueadas pela lógica de fechamento (`backend/src/modules/closing/closing-lock.ts`), impedindo inconsistências após o encerramento do período.

## Módulo Entrega Criativos (ADs)

- Aba dentro de **Entregas**, dedicada a **criativos** de vídeo ou imagem.
- Campos típicos: projeto, leva, plataforma, tipo de mídia, quantidade, data, opcionalmente investimento/ROAS e observações.
- **Valores** seguem **taxas configuráveis** por tipo de mídia (`AdCreativeRate`), com snapshot por linha (`unitValueSnapshot`, `lineTotalValue`) e suporte a valor manual quando aplicável.

## Validações

- Página **Validações** concentra o fluxo de **bônus manuais** vinculados a **AD**, **VSL Squad**, **Troca Squad** e **Lead/ML**, conforme regras de negócio implementadas no serviço de entregas/validação.
- Há **regras de unicidade de nomenclatura** que cruzam entregas e criativos (por exemplo, evitar duplicidade de identificadores lógicos usados no fechamento ou na auditoria).

## Qualidade Leva

- **Lotes (batches)** por editor; cada lote contém **itens** associados a projeto, número de leva e formato.
- **Nota** e cadência de itens alimentam **acurácia** e o **bônus de qualidade** que entra no consolidado mensal.
- Entidades principais no banco: `QualityBatch`, `QualityBatchItem` (e revisão de qualidade ligada a criativos via `QualityReview` quando aplicável).

## Configurações

- **Editores:** nome, cargo, tipo de produção, salário (base para fechamento), status ativo/inativo, cor/identidade visual na interface.
- **Valores de entrega:** cadastro dos valores base por tipo VSL (`DeliveryRate`).
- **Taxas de criativos:** valores por tipo de mídia de AD (`AdCreativeRate`).
- **Usuários:** criação de contas para acesso ao hub (e-mail/senha).

## Fechamento

- **Resumo por mês** interpretado em **UTC** (chave `YYYY-MM`), alinhado ao fechamento e aos snapshots.
- **Por editor:** salário fixo, bônus de entregas VSL (já rateado na distribuição), bônus de ADs, bônus de qualidade; totais e subtotais em centavos para precisão.
- **Alertas:** aviso de **entregas pendentes de KPI** ou outras pendências antes ou durante o fechamento (`pendingDeliveries`, mensagem de alerta no período).
- **Fechar período:** cria um **snapshot** (`ClosingPeriod` + `ClosingEditorSnapshot`) com os totais consolidados no momento do fechamento.
- **Histórico:** listagem e detalhamento de períodos já fechados.
- **Exportação XLS:** `GET /closing/export` (autenticado), com abas de **Resumo** e **Entregas por gestor**, para uso em planilha.

## Performance

- Filtros por **intervalo de datas**, **editores** e **tipos** de entrega.
- **KPIs** agregados e **gráficos** (Chart.js no frontend).
- **Custo do setor**, comparativos e **rankings** derivados da camada de serviço (`backend/src/modules/performance/performance.service.ts`), combinando entregas, ADs e dados de editores/rates conforme a implementação atual.

## Modelo de dados (visão geral)

Tabelas principais no `schema.prisma` do Prisma:

| Modelo | Função resumida |
|--------|-------------------|
| `User` | Usuários do sistema (login) |
| `Editor` | Editores operacionais e financeiros |
| `DeliveryRate` | Valor base por tipo de entrega VSL |
| `AdCreativeRate` | Valor unitário base por tipo de mídia de criativo |
| `Delivery` | Entrega VSL (campos de KPI, tier, bônus, snapshots) |
| `DeliveryEditor` | Junção N:N entre entrega e editores (rateio) |
| `AdCreative` | Linha de criativo (quantidade, valores, vínculo ao editor) |
| `QualityReview` | Revisão de qualidade ligada a um criativo |
| `QualityBatch` | Lote de qualidade por editor |
| `QualityBatchItem` | Item dentro do lote (projeto, leva, formato, nota) |
| `ClosingPeriod` | Período fechado (mês, totais, pendências) |
| `ClosingEditorSnapshot` | Snapshot financeiro por editor naquele fechamento |

Para enums (`DeliveryType`, status de entrega, tipos de mídia de AD, etc.), consulte o arquivo `backend/prisma/schema.prisma`.

## API REST (índice)

Registro de rotas em `backend/src/app.ts`. Prefixos principais (a **maioria exige** `Authorization: Bearer <token>`):

| Prefixo | Domínio |
|---------|---------|
| `/auth` | Login e identidade (`/login`, `/me`, etc.) |
| `/users` | Usuários do sistema |
| `/editors` | Editores |
| `/rates` | Taxas VSL e taxas de criativos |
| `/deliveries` | Entregas VSL e operações relacionadas |
| `/ad-creatives` | Criativos (ADs) |
| `/quality` | Lotes e itens de qualidade leva |
| `/closing` | Resumo, export, fechamento e períodos |
| `/performance` | Dados agregados para a tela de performance |

Rotas públicas típicas: apenas `POST /auth/login` (e health checks, se expostos). Demais operações passam pelo middleware de autenticação.

### Fechamento (endpoints úteis)

- `GET /closing/summary` — resumo do mês para fechamento.
- `GET /closing/export` — arquivo XLS.
- `POST /closing/close` — fechar período.
- `GET /closing/periods` — listar períodos fechados.
- `GET /closing/periods/:month` — detalhe de um mês fechado.

## UX e interface

- Interface em **tema escuro**, com elementos decorativos de **fundo estrelado** e **estrelas cadentes** para ambientação visual.
- Onde aplicável, o CSS respeita **`prefers-reduced-motion`** (por exemplo em `frontend/src/App.css`) para reduzir animações para quem prefere menos movimento no sistema operacional ou navegador.

## Limitações e extensões futuras

- **Perfis de usuário avançados** (papéis distintos com permissões por módulo) podem não existir no modelo atual; evoluções podem incluir RBAC e auditoria mais fina.
- O **fechamento** gera snapshots persistidos; reabrir ou “desfechar” um mês pode não estar previsto ou ser limitado — validar sempre com o time antes de alterar dados de períodos já fechados.
- Integrações externas (ERP, folha de pagamento automática) e relatórios adicionais podem ser plugados consumindo a API existente ou estendendo exportações.

---

Para instalação, variáveis de ambiente e comandos de desenvolvimento, use o `README.md` na raiz do projeto.
