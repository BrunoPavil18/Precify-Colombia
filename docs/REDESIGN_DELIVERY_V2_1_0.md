# Precify Financy 2.1.0 — Entrega Consolidada do Redesign
**Data:** 2026-11-01  
**Branch:** `feat/precify-financy-v2.1.0`  
**PR:** https://github.com/BrunoPavil18/Precify-Financy/pull/4 (**draft**)  
**Status:** interface e fluxos locais implementados, automaticamente testados; integração remota e release pública ainda não homologadas.  
**Run final de código:** https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41323103932  
**Commit de código validado:** `c5abb3e55d49fbf7b341b544b7245ddda5fd47ba`

## Resultado efetivamente implementado

| Frente do Plano Mestre | Entrega no código | Estado |
|---|---|---|
| R0 — Base preservada | `main` / v2.0.1 intactas; trabalho isolado na PR #4; não migra dados silenciosamente | Concluído |
| R1 — Jet Black e UI base | `dark-theme.css` com fundo `#121212`, superfícies, tokens verdes, controles, cards, tabelas, modal, estados e mobile | Concluído |
| R1 — Animações | Removido reset universal `prefers-reduced-motion` com `!important`; movimento leve padrão, redução dirigida apenas à escolha explícita do usuário | Concluído |
| R2 — Navegação por tarefas | Seções agrupadas Visão Geral, Precificação, Operações COD, Inteligência, Conexões e Dados; drawer no celular, cabeçalhos compactos | Concluído |
| R2 — Dashboard | Nova página inicial real, KPIs de produtos/cenários/análises, ações e jornadas guiadas; resultado apenas de dados existentes | Concluído |
| R3 — Precificação | Novo contexto visual na calculadora, filtros/ordenação no catálogo, rotas diretas PUM, preço consumidor, mix e preços ISO | Concluído para redesign |
| R4 — Operações e CAC | Rotas independentes para Painel COD, risco COD, Marketing e CAC, matriz CPA, importação CSV e referência de concorrência; fluxo pré-selecionado a partir do catálogo | Concluído para redesign |
| R5 — Inteligência | Pesquisa e ordenação por contribuição/margem/recência em relatórios; dashboard mostra dados COD/campanhas importados com origem marcada e sem misturar moedas | Concluído no recorte |
| R5 — Conexões e Dados | Estilo dark consistente no módulo opcional, sync por loja e dados/backup; texto de privacidade revisado | Concluído no recorte |
| R6 — QA | 108 testes, typecheck, lint, build, Chromium real com 19 rotas, mobile, animação padrão, criação/persistência local e ausência de exceções JS | **Aprovado automaticamente** |

### Componentes implementados/modificados
- `apps/web/src/OverviewDashboard.tsx`: dashboard local sem números fictícios e resumos operacionais importados.
- `apps/web/src/UIIcon.tsx`: ícones vetoriais locais, sem fontes externas.
- `apps/web/src/dark-theme.css`: tema completo dark-first, responsivo, animação normal por padrão.
- `apps/web/src/styles.css`: removido antigo reset global condicional de animação.
- `apps/web/src/App.tsx`: navegação agrupada, cabeçalhos, dashboard, abas profundas COD/CAC/CPA/PUM, filtros e ações contextuais.
- `apps/web/src/AdvancedLab.tsx` e `OperationsLab.tsx`: suportam acesso direcionado; troca de aba sem marcar rascunho como alterado, leitura operacional validada para o dashboard.
- `apps/web/src/i18n/pt-BR.ts` e `en.ts`: strings novas ES/PT/EN consolidadas.
- `scripts/browser-redesign-smoke.mjs`: testa a versão compilada em Chromium com captura de evidência visual.

## Evidência de homologação automatizada

**GitHub Actions run 41323103932 — SUCESSO**, HEAD de código `c5abb3e`:
- 61 testes do core, 22 testes web (incluindo cobertura de traduções), 7 testes do serviço, 18 testes de integração: **108/108**.
- TypeScript, lint AST, verificação do serviço conectado, Vite build de produção, pacote ESM: **aprovados**.
- Chromium real: fundo RGB (18,18,18), animação normal no estado padrão, 4 KPIs reais, **19 rotas navegáveis**, drawer mobile abrindo e fechando, **produto local salvo e preservado após recarga**, ausência de exceções JS.
- Screenshots de páginas principais, COD, marketing, relatórios, backup, desktop e mobile no artefato de Actions **`precify-dark-ui`** (retenção inicial: 7 dias).
- A verificação de persistência IndexedDB transacional por fonte e cursor também já foi comprovada antes, em https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41317968648.

### Escopo e limitações honestas

**Não incluído nesta entrega:**
- Conexão efetiva de uma loja real, provedor Meta em produção ou qualquer alteração na Vezura, Hostinger e Supabase.
- Instalador nativo Windows; esta candidata continua como PWA instalável no navegador.
- Painel executivo de receitas observadas sem registros importados (não deve inventar números).
- Desenvolvimento de novos conectores específicos Shopify, Mastershop, Nuvemshop, Google/TikTok Ads, Kirvano.
- Reescrita de relatórios como ferramenta completa de BI, histórico multi-origem unificado e gráficos avançados ainda não existentes. Essas expansões permanecem melhorias futuras, **não impedem o redesign visual/UI agora entregue**.
- Homologação manual no notebook do proprietário e credenciais/requisitos reais de fornecedores externos.

**Proteções preservadas:** fórmulas exatas e dinheiro BigInt, COP/ISO separados, ID e histórico, dados locais, exportação e backup, validação de CSV, não sobrescrever armazenamento danificado, autenticação conectada opcional e recuperação da sync por cursor, consentimento por site.

## Como abrir para inspeção (sem instalar na produção)

```bash
git switch feat/precify-financy-v2.1.0
git pull --ff-only
pnpm install --frozen-lockfile
pnpm dev
```

Navegue para o endereço local do Vite, normalmente `http://127.0.0.1:5173`, e confira Visão Geral, Calculadora, Produtos, Cenários, Metas, operações COD, Marketing/CAC, Relatórios, Dados e Conexões. Nenhuma migração ou credencial externa é necessária para testar o redesign local.

**Release:** manter PR #4 em draft; `main` e v2.0.1 preservadas até aceite explícito. A folha de estilo antiga continua no histórico Git, portanto o redesign é reversível por commit.
