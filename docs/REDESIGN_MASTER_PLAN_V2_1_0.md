# Plano Mestre — Redesign e Inteligência Operacional do Precify Financy
**Versão-alvo:** 2.1.0 (candidata, não publicada)  
**Data:** 2026-11-01  
**Repositório:** BrunoPavil18/Precify-Financy  
**Base de revisão:** PR #4, commit `f73c1166e4e15a28d6183466b96e1a78659de769`, código, capturas de nove páginas do usuário, vídeo tutorial fornecido e documentação pública do PrecifyCOD: https://precifycod.com/landing e https://precifycod.com/app-description.  
**Natureza original:** especificação e auditoria. **Atualização de 2026-11-01:** o redesign de interface foi implementado e validado em Chromium; consultar [relatório de entrega](REDESIGN_DELIVERY_V2_1_0.md) para separar o que está implementado das evoluções futuras.

## 0. Decisões aprovadas / limites

1. **Dark-first**, com identidade própria Precify Financy: fundo **Jet Black `#121212`**, acentos verdes/menta/teal, inspiração em densidade, ergonomia e organização do painel administrativo Vezura, sem copiar componentes de código, branding ou estilos protegidos.
2. Preservar operação **local-first/offline**, núcleo financeiro com dinheiro exato (inteiros/BigInt), formatos COP e ISO independentes, dados locais, backups, funcionalidades conectadas opt-in e integrações por conector genérico; não exigir conta para simular preço.
3. **Nenhuma alteração na Vezura** (repo, produção, MySQL, Hostinger, tokens). A interface pode mostrar fontes e conectores genéricos, identificando claramente quando não estão ligados.
4. **Sem redução global de animação como padrão.** Movimentos suaves e intencionais por default. A mídia `prefers-reduced-motion: reduce` atual só é ativada quando a plataforma solicita isso; a regra `*,*::before,*::after{animation:none!important;transition:none!important}` é excessivamente ampla e será substituída, durante a implementação, por acomodações específicas para quem escolheu acessibilidade. Não criar um `reduceMotion=true` automático, nem desligar transições no uso normal.
5. **Não inventar números** nos dashboards. “Simulado”, “declarado/importado”, “observado pela fonte”, “atribuído pela plataforma” e “conciliado” devem ser estados visíveis; não tratar custo desconhecido como zero; nunca agregar moedas diferentes sem conversão explícita e cotação datada.
6. Refatoração visual incremental e reversível na mesma branch da PR #4; preservar v2.0.1 estável e arquivos legados. Sem merge, release ou deploy até aceite.

## 1. Diagnóstico fundamentado no código e nas capturas

| Achado | Evidência no projeto | Consequência de UX | Ação |
|---|---|---|---|
| Menu linear com dez destinos de primeira classe | `apps/web/src/App.tsx` define `nav` com Calculadora, Produtos, Cenários, Metas, Informes, Dados, Avançado, Divisas, Operações COD, Conexões | Difícil descobrir o fluxo principal | Agrupar por tarefas; navegação com subitens e breadcrumbs claros |
| O aplicativo abre na calculadora sem visão gerencial | `useState<Page>("calculadora")` | Perde a oportunidade de mostrar o valor salvo em primeira entrada | Introduzir “Visão geral”, respeitando onboarding vazio |
| Cabeçalhos de marketing em todas as telas | `.page-heading`, `h1` com `clamp(2rem,3.6vw,3.2rem)`; slogan, versão, símbolo | Muito espaço perdido no topo | Cabeçalho funcional compacto (título, contexto, ação principal, status) |
| Ferramentas de alta utilidade ocultas | `AdvancedLab.tsx` tem `cod/campaign/pum/consumer/portfolio`; `OperationsLab.tsx` tem `unified/dashboard/import/matrix/prices` | Usuário precisa conhecer previamente a aba certa | Dar rotas/subrotas independentes e links contextuais |
| Catálogo e metas sem dados ficam isolados | Capturas Produtos, Cenários, Metas e Relatórios vazios | Ausência de orientação do próximo passo | Empty states com uma ação útil, sem preenchimento falso |
| Relatório de produtos simplificado | `App.tsx` “Ranking por contribuição”, exportações/histórico | Comparar por margem, risco, tendência ainda difícil | Comparações por produtos, cenários e fonte, com filtros |
| Multimoeda separada do legado COP | `CurrencyLab` e `GlobalPricingLab` isolados, COP preservado | O seletor `ISO/COP` da topbar não explica contexto | Hub “Moedas e conversões”, indicação explícita do motor ativo |
| Dois fluxos de dados com estados divergentes | `ConnectedLab` (serviço opcional), `WebsiteSyncLab` (feed por site), `OperationsLab` (CSV local) | Podem parecer uma mesma base ou vendas confirmadas | “Fonte de dados” persistente e nomenclatura padronizada |
| A redação “sem contas, sem servidores” aparece na área Dados | `App.tsx`, enquanto há ConnectedLab opcional | Potencial confusão | Explicar “modo local sem conta obrigatória”; modo conectado é opt-in |
| Escopo de CSS concentrado em folha grande sem design tokens | `apps/web/src/styles.css`, cores hex repetidas, quase todos os módulos usam `.advanced-results` | Polimento e consistência difíceis | Tokens CSS semânticos + componentes base |
| Quase sem movimento padrão | CSS contém uma transição explícita em `.nav-link` | Interface estática; mudanças de estado abruptas | Adicionar microinterações e transições contextuais, sem prejudicar desempenho |
| Redução total condicional | `@media(prefers-reduced-motion:reduce)` com seletores universais | Desliga tudo para pessoas com essa preferência; não é configuração global por default | Refatorar para tratamento de elementos relevantes, sem `!important` universal |

### Principais critérios extraídos do tutorial e das páginas do PrecifyCOD
- O vídeo fornecido demonstra **painel inicial com KPIs**, **distribuição/indicadores de entregas**, **calculadora com custos detalhados, taxa de entrega/aprovação e métricas de anúncios no contexto do preço**, além de **visão das integrações**. Essas são referências de fluxo, não autorização de reprodução visual/código.
- O site público descreve dashboard unificado, pedidos, ROAS/CPA, marketing, relatórios, histórico de preços, múltiplas lojas, Meta OAuth, API/webhooks e conector por plataforma. **Declarações comerciais do site não são prova de que seus serviços externos já funcionam** nem obrigação de replicar assinaturas/Kirvano.
- O Precify Financy é mais forte no **cálculo transparente/offline**, mas mais fraco na **descoberta dos módulos**, na apresentação de indicadores e na organização por tarefa.

## 2. Inventário funcional: presente × parcialmente exposto × faltante

**Estado “implementado” refere-se à existência de lógica/painel no repositório, não à homologação de uma integração real.**

| Capacidade | Situação observada | Intervenção proposta | Prioridade |
|---|---|---|---|
| Precificação COP exata, custos, margem, desconto e preço mínimo | Motor implementado | Nova experiência de edição e resultado, indicadores orientados à decisão | P0 |
| Catálogo, duplicação, histórico local e exportações | Implementado, apresentação simples | Busca/ordem/filtros, comparações, ações diretas e estado vazio guiado | P0 |
| Cenários otimista/esperado/conservador | Implementado (criação por produto) | Cartões comparativos, diferenças por métrica, aplicar sem sobrescrever automaticamente | P0 |
| Metas e ponto de equilíbrio | Implementado | Meta visual com inputs claros, unidades/receita/risco, navegação por produto | P1 |
| Risco COD e perdas por fase | Motor de simulação implementado | Destacar taxa de aprovação, envio, entrega, pagamento e custos condicionais em funil visual | P0 |
| Publicidade e CAC, ROAS/limites | Implementado em `AdvancedLab` e funções do core | Tela principal “Marketing e CAC” + associação com preço/funil e origem dos dados | P0 |
| Matriz CPA × taxa de entrega/pagamento | Implementado em `OperationsLab` | Gráfico/heatmap acessível com ponto de equilíbrio, sem esconder na quinta aba | P0 |
| Preço por unidade e preço ao consumidor | Implementados em “Avançado” | Ferramentas localizáveis em “Precificação” | P1 |
| Carteira multiproduto | Implementado em “Avançado” | Expor como análise de mix/custos fixos compartilhados | P1 |
| Operações: eventos, painel de pedidos e importação CSV | Implementado localmente | Painel COD separado de importações; métricas por status/proveniência | P0 |
| Análise manual de preços concorrentes | Implementado como registros pontuais | Histórico e comparação por produto; **não** prometer web scraping | P1 |
| Câmbio e catálogo ISO independentes | Implementado com referência diária | Hub de ferramentas com indicação da cotação, data e validade | P1 |
| Meta Ads OAuth, insights e múltiplas contas | Base de serviço e interface implementadas, dependem de credenciais/revisão/testes reais | Jornada de conexão, estado/erros e dados atribuídos claramente identificados | P1 (UI), produção bloqueada |
| Feed genérico site-owned, 60 s/manual e cache IndexedDB | Implementado e smoke Chromium validado | Painel “Fontes e sincronização” com conectores e progresso/histórico por fonte | P1 |
| Dashboard central de visão geral | **Não existe como home** | Criar dashboard baseado em dados reais locais; diferenciar vazio/sem evidência | P0 |
| Relatórios por data, fonte, produto e campanhas com comparações | Parcial/fragmentado | Consolidação com filtros visíveis; exportar e rastrear origem | P1 |
| Histórico cruzado de alterações/decisões | Parcial por módulo | Timeline unificada sem misturar proveniências; filtros por produto | P2 |
| Conectores nativos Shopify/Mastershop/Nuvemshop | Não implementados no Precify Financy | Manter como futuros adaptadores opcionais, nenhum vínculo específico nesta conversa | Futuro |
| Google Ads/TikTok/Kirvano, assinaturas/pagamentos | Não implementado | Fora do recorte do redesign 2.1.0; avaliar separadamente | Futuro |

## 3. Nova arquitetura de informação / sidebar

**Sidebar por objetivo, não por origem dos componentes.** Primeira camada reduzida; subitens acessíveis em até 2 níveis. Os rótulos serão localizados ES-CO / PT-BR / EN.

### Visão geral
- **Dashboard** (novo padrão de entrada; se não houver dados, jornada “Criar primeiro produto” com valores zerados/indisponíveis honestos).
- Atividade recente (bloco no dashboard, não 11ª página independente).

### Precificação
- **Calculadora** — COP, com CTA central “Salvar / Comparar / Simular COD”.
- **Produtos** — catálogo, ordenação, filtros, duplicação, status de origem.
- **Cenários e metas** — duas rotas/abas contextuais, sem ocultar ações.
- **Ferramentas de preço** — unidade (PUM), preço ao consumidor, carteira multiproduto.
- **Precificação internacional** — catálogo ISO separado do COP.

### Operações
- **Painel COD** — funil de pedidos por fase, taxas e perdas.
- **Risco e simulação COD** — premissas, custos por etapa, sensibilidade.
- **Marketing e CAC** — anúncios, limite CPA, ROAS observados/atribuídos/estimados.
- **Matriz CPA** — visualização de entrega × aquisição; filtros próprios.

### Inteligência
- **Relatórios** — rankings, gráficos, períodos, exportações.
- **Concorrência** — preços registrados e evolução histórica.
- **Histórico** — alterações locais, preço, cenário, origem e hora.

### Conexões e dados
- **Fontes e sincronização** — lojas genéricas, CSV, situação offline, próxima atualização, botão “Sincronizar agora”.
- **Contas e campanhas** — modo conectado opcional, organizações, Meta quando configurado.
- **Moedas e câmbio** — cotações indicativas e validade.
- **Dados e privacidade** — backup, restauração, exclusão confirmada e localização dos dados.
- **Configurações** — idioma, informações da aplicação, versão, tema futuro apenas se explicitamente aprovado.

**Regra:** painéis de “Avançado” e “Operações COD” atuais não devem desaparecer: migrar suas ferramentas para endereços compreensíveis, com redirecionamento/aliases internos e reaproveitamento do motor existente.

## 4. Design system dark-first (Vezura admin como referência de ergonomia, identidade Precify original)

### Tokens de cor propostos
| Papel | Token | Hex |
|---|---|---|
| Fundo raiz | `--pc-bg` | **#121212** |
| Sidebar e superfícies profundas | `--pc-sidebar` | #141B18 |
| Card padrão | `--pc-surface` | #1B211E |
| Card elevado / popover | `--pc-surface-raised` | #242D28 |
| Hover neutro | `--pc-hover` | #2B3932 |
| Borda sutil | `--pc-border` | #344239 |
| Texto principal | `--pc-text` | #EDF6F0 |
| Texto secundário | `--pc-muted` | #A8BCAF |
| Ação primária | `--pc-primary` | #23B785 |
| Verde profundo | `--pc-primary-deep` | #137B58 |
| Verde menta | `--pc-mint` | #8BE5C1 |
| Informação | `--pc-info` | #71B9DE |
| Atenção | `--pc-warning` | #EDC575 |
| Falha/custo | `--pc-danger` | #F28F88 |

Ajustar estados e pares de contraste com auditoria WCAG 2.2 AA; não usar apenas cor para representar aprovação, risco ou status.

### Componentes-base necessários
- `AppShell`, `SidebarGroup`, `TopBar`, `PageHeader`, `PageActions`.
- `KPI` com rótulo, unidade, data, procedência e estado sem dados.
- `Panel`, `DataTable`, `EmptyState`, `FilterBar`, `SourceBadge`, `SyncState`, `Timeline`.
- `MoneyInput`, `PercentInput`, `Select`, `FormSection`, `ConfirmDialog`, `InlineError`, `Skeleton`.
- `LineChart`, `FunnelChart`, `SensitivityHeatmap`, com equivalência textual/tabela acessível e indicação “estimado”/“observado”.

### Densidade, hierarquia e responsividade
- Cabeçalho interno compacto: título (22–30 px), uma linha de contexto, ação principal e status; sem hero de landing em telas operacionais.
- Sidebar ~240–264 px, recolhível por botão em desktop; mobile em drawer acessível, sem lista infinita horizontal.
- KPIs em grade adaptativa 4→2→1; gráficos jamais devem ocultar valores ao leitor de tela.
- Formulários agrupados por custo, impostos, marketing, margem e resultado; ajuda ao lado do campo, não uma parede de texto.
- Resultado da calculadora em card de destaque sticky **apenas quando houver espaço**, com alternativa acessível quando não.
- Tabelas com cabeçalho fixo e filtros, rolagem/colunas adaptativas, nunca valores cortados ou totais sem unidade.
- Ações destrutivas e restauração com confirmação; telas vazias com uma única próxima ação clara.

## 5. Animação e interação — regra explícita

**Resultado da auditoria:** CSS atual usa `@media(prefers-reduced-motion:reduce)` e aplica desativação universal com `!important`; isso **não é habilitado para todos**, somente para quem informa preferir menos movimento. Não há configuração persistida que escolha “reduzido” automaticamente, nem `matchMedia` para forçar esse modo no JS.

**Política para implementação:** movimento **normal por padrão**. Não adicionar `reduced` como default nem `animation: none`/ `transition: none` globais. Usar:
- Hover/foco/press: 120–180 ms, cor, elevação e brilho moderado.
- Troca de abas/rotas: 160–240 ms, opacidade + deslocamento pequeno (4–10 px) sem reflow.
- Cards/KPIs ao carregar: 200–320 ms, entrada discreta **uma única vez**, sem reanimar a cada atualização de 60 segundos.
- Modais/drawers: 180–260 ms; foco correto e `Escape`.
- Gráficos: 250–450 ms quando dados chegam, sem animar mudanças financeiras de forma enganosa.
- `prefers-reduced-motion:reduce`: apenas quem escolheu explicitamente, desacelerar/alternar animações decorativas específicas, **nunca** desligar toda a UI com seletor universal.
- Não introduzir carrosséis que se movem sozinhos ou parallax. Performance: respeitar pintura/composição, transições preferencialmente `transform`/`opacity`, sem layouts pesados ou polling de animação.

**Teste de regressão obrigatório:** Chrome com movimento padrão tem microinterações; a configuração do SO não deve ser interpretada como “sempre reduzida”; ao simular preferência explícita reduzida, não há perda de funcionalidade e o foco permanece acessível.

## 6. Auditoria por página com intervenções concretas

| Página atual | Manter | Redesenhar / criar | Não fazer |
|---|---|---|---|
| Calculadora | Motor COP, percentuais, descontos, resultado em tempo real, regras legais | Formulário em passos claros, resumo vivo, decomposição de custos, CTA para COD, salvar/comparar, preço mínimo e faixa segura | Alterar fórmulas para adequar layout |
| Produtos | Salvar, editar, duplicar, origem e categoria | Busca, filtros, lista/cards, custos-chave, linha de contribuição, links para simular/comparar; onboarding sem dados | Adicionar “produtos fictícios” ao catálogo |
| Cenários | Vinculação a produto, edição não destrutiva, otimista/esperado/conservador | Comparador lado a lado, diferenças preço/margem/lucro, CTA “carregar na calculadora” com confirmação | Alterar o produto original sem consentimento |
| Metas | Custos fixos, volume, ponto de equilíbrio | Barra meta × projeção, unidades faltantes, premissas, viabilidade e alertas de contribuição nula | Sugerir equilíbrio impossível |
| Relatórios | Ranking, histórico e exportação CSV/JSON | Filtros, gráfico de evolução, ranking de margem/rentabilidade, fontes e períodos; comparador | Chamar dados simulados de vendas reais |
| Dados | Backup/restauração, bloqueio de dados corrompidos, confirmação | Hub de privacidade por armazenamento: COP, ISO, operações, conectores; tamanho/estado/backups por módulo | “Apagar todos” sem listar alcance e confirmação |
| Avançado | Cinco motores existentes | Remover rótulo opaco e oferecer entradas próprias para COD/CAC/PUM/consumidor/mix | Reescrever as fórmulas por motivo estético |
| Moedas | Cotações Frankfurter, data, offline | Painel menor com origem/timestamp, campo de conversão e “cotação desatualizada” | Chamar cotação diária de tempo real |
| Operações COD | Cinco ferramentas, importação, métricas, matriz e concorrentes | Distribuir por Painel COD, Marketing & CAC, Matriz CPA, Concorrência, Importação; filtros/funil comparativo | Presumir pedido “pago” por estar entregue |
| Conexões | Conta opcional, Meta, chave/secretos protegidos no backend, feed genérico | Fluxo de conectar com estados “não configurado”, “requer autenticação”, “sincronizando”, “erro”, “offline”, “última atualização” | Expor chave global no navegador |
| **Nova** Visão geral | Reusar estatísticas locais | KPIs úteis com fonte, tendências e ações do dia; zero state especial | Dashboard inventado com métricas mockadas em produção |
| **Nova** Histórico | Reusar registros existentes | Timeline unificada com filtros, sem migrar/sobrescrever dados sem esquema versionado | Confundir histórico de edições com evidência de pagamentos |

## 7. Jornadas completas de UX (critérios de aceite)

### Jornada A — primeiro produto, offline
1. Instala/abre sem conta; dashboard indica “nenhum produto” e oferece **Criar produto**.
2. Insere custos e margem; resultado é recalculado sem recarregar; vê como frete/publicidade/COD afetam preço.
3. Salva e encontra o produto no catálogo; consegue criar cenário e acessar metas em até três ações.
4. Sem internet, catálogo e simulações continuam acessíveis; nenhum número é transmitido sem consentimento.

### Jornada B — validar COD e marketing antes de escalar
1. Abre produto salvo; entra em **Risco COD** com contexto do produto, preço e moeda.
2. Informa taxas de envio/entrega/pagamento e custos condicionais; visualiza funil de 100 pedidos hipotéticos e contribuição **simulada**, com premissas visíveis.
3. Abre **Marketing & CAC**, compara CPA máximo e ROAS de equilíbrio; a matriz destaca regiões de viabilidade.
4. Salva cenário e retorna à calculadora sem reescrever o cadastro original.

### Jornada C — CSV e dados observados
1. Vai em **Importar dados**; escolhe pedidos ou campanhas, associa cabeçalhos CSV, vê validação e amostra antes de confirmar.
2. “Observado/importado” aparece diferente de “projetado”. Reconciliação exige ID de campanha e janela temporal.
3. Filtros por loja/produto/período/moeda; totais parciais não são rotulados como completos.

### Jornada D — conectar site genérico
1. Acessa Conexões, adiciona URL HTTPS e credenciais de leitura restrita.
2. Consente o cache por fonte; vê a sincronização inicial, o cursor, a última atualização, intervalo configurável e **Sincronizar agora**.
3. Desliga/abre novamente: o app pede autenticação antes de buscar alterações, preserva cache consentido, não afirma sincronização enquanto fechado.
4. Desconexão e revogação de consentimento limpam somente o cache da fonte selecionada.

## 8. Ordem de implementação — entrega consolidada

| Bloco | Escopo de código | Dependências | Gate |
|---|---|---|---|
| **R0** Baseline/backup | Congelar snapshot de estilo atual, testes de invariantes do motor, capturar viewport/cobertura por rota | Branch PR #4 | Baseline reproduzível; sem editar v2.0.1 |
| **R1** Design system | Tokens dark, shell, topbar, sidebar, cards, tipografia, inputs, foco, estados, motion | R0 | Desktop/tablet/mobile sem cortes, sem reduced automático |
| **R2** Navegação e Dashboard | Nova arquitetura, menu hierárquico, visão geral e empty states | R1 | Todas as rotas acessíveis sem perda dos formulários; acesso a módulos-chave em até 3 ações |
| **R3** Precificação | Calculadora, catálogo, cenários/metas, internacional, PUM/consumidor/mix | R2 | Paridade numérica, salvamento e backups, zero regressão COP/ISO |
| **R4** COD e marketing | Funil, precificação integrada, CAC, ROAS, CPA matrix, importações/concorrência | R3 | Perdas corretas por etapa, dados observados × simulados separados |
| **R5** Inteligência e Conexões | Relatórios, histórico, dashboard contextual, estado por fonte e segurança visual | R4 | Isolamento por tenant/loja, indicadores com período/unidade/fonte |
| **R6** Qualidade e homologação | Responsividade, teclado, internacionalização, animações, offline PWA, testes Node/Chromium, auditoria visual | R1–R5 | Gates verdes + checklist manual sem bugs bloqueantes; permanecer draft até aceite |

**Diretriz operacional do usuário:** realizar implementação por blocos internos mas apresentar **uma entrega consolidada**, evitando interrupções por testes intermediários sem necessidade. Não abrir PRs adicionais desnecessárias; usar a PR #4 já existente.

## 9. Regras de segurança e continuidade

- `main` e v2.0.1 são base estável; estilos antigos devem poder ser revertidos por commit/tag/backup de branch, não por importação destrutiva.
- Nenhum rewrite de `packages/core` somente por design; qualquer cálculo alterado exige testes exatos equivalentes e justificativa.
- Respeitar precisão em unidades monetárias/BigInt, IVA configurável, PUM, descontos, frete, custos por fase COD, FX com data e origem, cenários inválidos e liquidez nula.
- Preservar `localStorage` e IndexedDB keys, proteções contra duplicação/conflitos, API de import/export, escopo de cada módulo, sincronização manual/60 s, conta e API opcionais.
- Não armazenar Meta secrets ou tokens de APIs administrativas em localStorage; não alterar schema Supabase sem plano de migração aprovado.
- Não adotar números sem fonte, inclusive dashboard mockado. Marcar claramente “Sem dados”, “Não configurado” e “Não calculável”.
- UI completa em espanhol colombiano, português brasileiro e inglês. Traduções de rótulo, ajuda, erro, status e acessibilidade.
- Teste de viewport 360/390/768/1024/1440/1920, zoom 200%, teclado, contraste, preferências de SO para movimento, estados sem dados/com dados/com erro/offline; Lighthouse/a11y quando viável.
- Se der falha no CI, corrigir e revalidar; não dizer “homologado” só porque build passou.
- **Fora deste chat:** qualquer implementação ou mudança específica da Vezura.

## 10. Critérios finais da candidata R6

- [ ] Dashboard dark-first com Jet Black `#121212` como fundo predominante e identidade verde Precify.
- [ ] Animações fluidas padrão sem condição de “reduced” forçada; exceção acessível somente para escolha explícita.
- [ ] Todas as páginas migradas para componentes/tokens consistentes, sem hero de landing em tela operacional.
- [ ] Módulos COD/marketing/CPA/PUM/preço consumidor/mix facilmente descobertos.
- [ ] Nenhuma perda dos dados da v2.0.1, do catálogo ISO, dos backups e das integrações opcionais.
- [ ] Sem mistura de moedas, inferência de lucro sobre custos ausentes ou atribuição de vendas não verificadas.
- [ ] Responsividade desktop/tablet/mobile e navegação teclado/tela de leitor.
- [ ] Testes automáticos e browser real aprovados; pelo menos uma validação visual manual na candidata.
- [ ] PR #4 documentada; **nenhum merge/release/deploy** sem aceite explícito do responsável.

### Nota de escopo
Este documento autoriza **o planejamento e design da evolução**, não autoriza deploy ou conexão comercial real. O objetivo é transformar a riqueza funcional já presente no Precify Financy em uma experiência intuitiva e agradável para qualquer usuário — sem depender de uma plataforma específica.
