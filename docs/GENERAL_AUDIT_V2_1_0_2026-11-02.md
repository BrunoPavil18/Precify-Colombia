# Auditoria geral — Precify Financy 2.1.0
**Data:** 2 de novembro de 2026  
**Escopo:** candidata de desenvolvimento `feat/precify-colombia-v2.1.0`, PR #4 no repositório `BrunoPavil18/Precify-Financy`. A `main` e a versão estável 2.0.1 foram preservadas.  
**Método:** revisão de código e contratos do núcleo financeiro TS/BigInt, persistência nativa Rust/SQLite, PWA/IndexedDB, seleção de negócios, integração de loja, credenciais Ed25519 e serviço opcional, interface ES/PT/EN, scripts de build, testes de regressão e execução de CI/Chromium; sem instrumentar uma loja real.

## Resposta à captura enviada pelo proprietário

A tela de **Fontes e conexões** não estava correta como ponto inicial do fluxo aprovado. O formulário primário era precedido por "Conta opcional, controle por organização e API aberta" (serviço antigo de contas, que fica sem configuração por padrão), e o rodapé do novo conector ainda mencionava token de sessão / API bearer v1. O usuário poderia interpretar erradamente que a configuração de uma conta central era necessária ou que a integração com lojas estava quebrada.

**Corrigido:** agora a sincronização de lojas com dispositivo v2 ocupa o topo; instruções em três etapas esclarecem URL HTTPS, convite de uso único emitido pela loja e ativação; há estado vazio e link ao contrato técnico. A área de contas e organizações continua acessível como recurso avançado, recolhida por padrão e sem montar o módulo opcional até a abertura. O rodapé destaca Ed25519 e API v2; conexões pré-existentes com bearer v1 permanecem por compatibilidade e têm aviso separado. A conexão real continua dependendo do backend da loja, que ainda não foi implantado na Vezura.

## Matriz de achados desta revisão

| Severidade | Área | Diagnóstico | Resultado |
|---|---|---|---|
| Média (UX) | Fontes e conexões | Conta central opcional aparecia antes do fluxo de loja aprovado e mostrava "modo não configurado" sem contexto | **Corrigido**: dispositivo v2 primeiro, conta antiga recolhida |
| Média (documentação/segurança operacional) | Conector da loja | Texto descrevia token v1 em novas instalações que usam chave Ed25519 | **Corrigido**: novo texto ES/PT/EN e orientação de revogação no servidor |
| Média (concorrência) | Operações multiempresa | Listener de alterações em outra aba comparava a chave global `KEY`, ignorando o sufixo de negócios secundários | **Corrigido**: usa `storageKey()` do negócio ativo; CAS nativo já existente permanece |
| Média (resiliência) | Inicialização SQLite | Falha de leitura no bootstrap podia impedir que React exibisse qualquer interface de recuperação | **Corrigido**: tela de falha visível, sem apagar ou substituir dados, com detalhe e retry |
| Baixa (precisão) | Salvar produto no navegador | Mensagem afirmava gravação em SQLite mesmo na PWA | **Corrigido**: diferencia armazenamento nativo e browser |
| Baixa (consistência visual) | Ícones | Uso de `chevron-up`/`chevron-down` não definidos no catálogo local de SVG, gerando ícone substituto | **Corrigido**: usa `chevron` com rotação |
| Média (documentação) | README ES/PT/EN | Textos principais ainda descreviam somente PWA/IndexedDB, API v1 e migração futura do SQLite | **Corrigido**: fonte principal SQLite no Windows, fluxo v2 e PWA separados |
| Média (integração futura) | Plano Vezura | Documento original recomendava token bearer compartilhado como caminho novo e API v1 | **Corrigido**: protocolo v2 por instalação, convite único, MySQL, assinatura/nonce, revogação e outbox |
| Baixa (teste) | SQLite Windows | Testes nativos eram todos em memória | **Ampliado**: teste real em arquivo com fechar/reabrir, WAL, CAS, isolamento e `PRAGMA integrity_check` |
| Baixa (teste) | Chromium | Não testava especificamente se o painel antigo tinha sido rebaixado para uma seção opcional | **Ampliado**: exige onboarding v2, ausência do módulo antigo antes de expandir, abre/recolhe sem exceções |

## Verificações automatizadas

- **117/117 testes JavaScript**: 61 núcleo financeiro, 27 web, 7 serviço conectado e 22 integrações. Verificação de tipos, lint AST, build Vite e distribuição ESM do núcleo executados em `pnpm verify:2.1.0`.
- **Chromium real — aprovado:** todos os 19 módulos, tema Jet Black, animação normal, separação entre negócios, criação/salvamento após recarga, rota de escolha de negócio em modo "Todos", menu e barra móvel, **nova jornada Fontes e conexões** (painel v2 primeiro, contas opcionais recolhidas/expansíveis), sem exceções JS. Execução: https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400054914
- **Rust/SQLite:** testes de snapshots/versões, cache transacional de feed, isolamento e persistência em arquivo real. Resultado do job Windows específico pode ser inspecionado no run https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41399635477.
- **Dependências:** `pnpm audit --audit-level moderate` passou sem vulnerabilidades conhecidas na verificação de 02/11/2026: https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41396477317.
- **Nota de rastreabilidade:** o primeiro job Chromium do run 41399635477 encontrou uma falha de **aspas no script de teste adicionado**, não uma falha do código financeiro. Isso foi corrigido e o Chromium passou no run separado 41400054914.

## Controles que foram inspecionados e preservados

1. **Cálculos e dados:** `@precify-financy/core` usa BigInt/unidades menores e validação de limites, mantendo margem, contribuição, IVA declarado, COD, campanhas, CPA e moedas ISO separados. Os testes automatizados passaram; **isso não equivale a auditoria contábil ou validação jurídica colombiana independente**.
2. **SQLite:** snapshots por negócio são gravados com revisão otimista antes de atualizar a projeção UI. O cache nativo do feed e os snapshots usam o mesmo `precify-financy-local.db`, com WAL/commit transacional. PWA usa APIs web próprias; chave privada WebCrypto fica no armazenamento seguro lógico do perfil (não é automaticamente TPM).
3. **Credenciais de loja:** o código de convite emitido pelo servidor da loja é consumido atomicamente uma vez, com Ed25519, timestamp e nonce para cada GET. Nenhum cadastro central de funcionários Precify é necessário. A revogação é server-side; apagar o dispositivo local não bloqueia a credencial remotamente.
4. **Escopo e privacidade:** perfis de negócio e cursores do feed são isolados; números calculados e registros não conciliados não são declarados como saldo bancário, lucro real ou pagamento confirmado. Tokens/segredos de administração não devem entrar no cliente.
5. **Distribuição:** Tauri 2 / WebView2 e Inno/ZIP como formatos Windows, PWA separada, sem necessidade de Node.js local no aplicativo instalado.

## Limites reais, não corrigidos nesta entrega por dependerem de validação externa

- **Vezura:** ainda não há endpoint real `/precify/v2/*`, feed financeiro durável, emissão/revogação de convites pela administração do site, cenário real de dois computadores ou homologação de pedidos COD. O guia específico é `docs/VEZURA_INTEGRATION_NEXT.md`.
- **Segurança física e operacional:** chave Ed25519 não exportável pelo WebCrypto não garante identidade intransferível perante cópia completa do perfil do sistema; hardware attestation/TPM não está implementado. A revogação não apaga dados já sincronizados offline.
- **Distribuição Windows:** o executável é não assinado, WebView2 Runtime é necessário e não há atualizador assinado automático nem sincronização enquanto o app está fechado.
- **Backup/recovery:** validação de reinício do SQLite feita por teste automatizado, mas recuperar um computador totalmente perdido, backup externo e reemissão de identidade precisam de política operacional.
- **Reprodutibilidade Rust:** `Cargo.lock` não está versionado na candidata; `pnpm-lock.yaml` sim. Fixar o grafo de dependências Rust antes de uma release estável assinada é uma melhoria recomendada.
- **Validação profissional:** regras fiscais e hipóteses de custo para COD/IVA da Colômbia exigem revisão especializada antes de uso como decisão fiscal formal. Testes financeiros são técnicos.
- **Produção:** não houve merge, tag, deploy, autorização Meta real, teste com pedidos vivos ou substituição da `main`.

## Critério de saída

**A candidata está pronta para validação final do executável Windows e desenvolvimento do adaptador real da Vezura; não está homologada como integração comercial em produção.** A tela de Fontes e conexões foi corrigida, mas ainda não aparecerá automaticamente na instalação antiga do usuário: é necessário abrir o **novo ZIP/instalador** após o build da branch.
