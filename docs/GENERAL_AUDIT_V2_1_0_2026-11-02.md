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
| Alta (isolamento) | Importação opcional para servidor remoto | Usava sempre a chave de operações do negócio principal, mesmo com outro perfil ativo; risco de enviar dados do negócio errado | **Corrigido**: chave do perfil ativo e confirmação explícita do par negócio local → organização remota, com teste novo |
| Média (concorrência) | Operações multiempresa | Listener de alterações em outra aba comparava a chave global `KEY`, ignorando o sufixo de negócios secundários | **Corrigido**: usa `storageKey()` do negócio ativo; CAS nativo já existente permanece |
| Média (resiliência) | Inicialização SQLite | Falha de leitura no bootstrap podia impedir que React exibisse qualquer interface de recuperação | **Corrigido**: tela de falha visível, sem apagar ou substituir dados, com detalhe e retry |
| Baixa (precisão) | Salvar produto no navegador | Mensagem afirmava gravação em SQLite mesmo na PWA | **Corrigido**: diferencia armazenamento nativo e browser |
| Baixa (consistência visual) | Ícones | Uso de `chevron-up`/`chevron-down` não definidos no catálogo local de SVG, gerando ícone substituto | **Corrigido**: usa `chevron` com rotação |
| Média (documentação) | README ES/PT/EN | Textos principais ainda descreviam somente PWA/IndexedDB, API v1 e migração futura do SQLite | **Corrigido**: fonte principal SQLite no Windows, fluxo v2 e PWA separados |
| Média (integração futura) | Plano Vezura | Documento original recomendava token bearer compartilhado como caminho novo e API v1 | **Corrigido**: protocolo v2 por instalação, convite único, MySQL, assinatura/nonce, revogação e outbox |
| Baixa (teste) | SQLite Windows | Testes nativos eram todos em memória | **Ampliado**: teste real em arquivo com fechar/reabrir, WAL, CAS, isolamento e `PRAGMA integrity_check` |
| Baixa (teste) | Chromium | Não testava especificamente se o painel antigo tinha sido rebaixado para uma seção opcional | **Ampliado**: exige onboarding v2, ausência do módulo antigo antes de expandir, abre/recolhe sem exceções |

## Verificações automatizadas

- **118/118 testes JavaScript**: 61 núcleo financeiro, 28 web, 7 serviço conectado e 22 integrações. Verificação de tipos, lint AST, build Vite e distribuição ESM do núcleo executados em `pnpm verify:2.1.0`.
- **Chromium real — aprovado:** todos os 19 módulos, tema Jet Black, animação normal, separação entre negócios, criação/salvamento após recarga, rota de escolha de negócio em modo "Todos", menu e barra móvel, **nova jornada Fontes e conexões** (painel v2 primeiro, contas opcionais recolhidas/expansíveis), sem exceções JS. Execução: https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400861130
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

## Revalidação de segurança após o último hotfix

Uma revisão da ação `uploadLocal()` em `apps/web/src/ConnectedLab.tsx` encontrou que a leitura ignorava o negócio ativo. Corrigimos para `businessKey(LOCAL_OPERATIONS,getBusinessScope())` e exigimos confirmação explícita do destino `perfil local → organização remota` antes de liberar o botão. A confirmação é revogada ao trocar a organização e após a importação. A interface de contas permanece opcional e recolhida. Os **118 testes JS**, build e Chromium foram aprovados em [Actions #41400861130](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400861130). O novo empacotamento Windows está no [gate final](https://github.com/BrunoPavil18/Precify-Financy/actions) (substituir pelo identificador real após confirmação).

## Encerramento dos testes automáticos e dos pacotes

O último código de aplicativo compilado foi o da execução [#41400964119](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400964119): **118 testes JS + 4 testes Rust, typecheck, build, Chromium com onboarding v2 e empacotamento Windows, todos aprovados**. Pacotes e checksums SHA-256 conferidos:

| Arquivo | SHA-256 |
|---|---|
| `Precify-Financy-2.1.0-win64.zip` | `2ce0b266ffc3129a74f9ba4714fd3e6d5545f998fdc57c2d1ef44742a7784f0b` |
| `Precify-Financy-2.1.0-setup.exe` | `11b238a743d8a0348a5bdf6f99ab5dd75cacc8f9c55aad75ed87cc0aff052556` |

A `main` permanece intacta; este fechamento **não declara** a API da Vezura implementada nem aprovação fiscal/contábil independente.


## Segunda rodada — falha do link do guia no Windows e robustez de conexão (02/11/2026)

**Incidente reproduzível no desenho da interface:** o guia de integração era apenas um `<a target="_blank">` para documentação do GitHub. O destino é válido, mas o WebView2/Tauri pode não oferecer abertura externa nesse contexto; clicar aparentava não executar ação. A correção é um botão acessível que abre o guia **dentro do próprio Precify** (ES/PT/EN), com explicação da implantação da API, SQL MySQL/PostgreSQL, endpoints, segurança, emissão/revogação e link complementar. Há também URL selecionável para cópia caso a navegação externa continue bloqueada.

**Robustez de dispositivos:** a identidade Ed25519 pendente é agora gravada em IndexedDB antes do POST de ativação. Se o servidor consumir o convite e a resposta ou o commit local falhar, o aplicativo tenta recuperar a mesma identidade pelo `GET /precify/v2/identity` assinado (inclusive depois de reabrir). Identidades pendentes não são tratadas como ativas. O cliente não recria outra chave para tentar reutilizar um convite já consumido; cada instalação continua exigindo convite único no backend da loja.

**Ciclo de vida do sincronizador:** o cleanup é registrado *antes* da chamada assíncrona de identificação, evitando timers e listeners órfãos quando componentes são desmontados rapidamente. Depois da descoberta de `subject`, o update revalida a configuração persistida, prevenindo a substituição silenciosa de intervalo/consentimento alterados durante a requisição. A remoção aguarda a atualização do relatório local, além do feed, antes de expurgar os eventos.

**Cobertura:** contratos estáticos adicionais para guia, ativação resiliente e limpeza; a jornada Chromium agora abre/fecha o guia, confere os três endpoints e produz uma captura adicional. O workflow Windows + browser é o gate integral da candidata. Testes automáticos não substituem Windows WebView2 no notebook do proprietário nem uma implantação de loja.

**Limites remanescentes (não classificar como defeito corrigido):** Vezura sem endpoints de produção, sem homologação COD/Meta em produção, executável não assinado, `Cargo.lock` não versionado, ausência de hardware attestation, revogação incapaz de apagar dados já em cache offline, e testes independentes fiscais/jurídicos ainda externos. A área de contas legada segue recolhida por padrão e disponível **somente** para compatibilidade. Nenhuma alteração em `main`, no servidor da Vezura ou no Supabase foi executada nesta rodada.


### Gate final desta segunda rodada — confirmado

**[GitHub Actions #41518692636](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41518692636): SUCCESS**, usando o código do commit `49cba8046f961e13385823d375ad1c49610545f5`.

- JS: **122/122 testes**, sem falhas (core 61, web 32, serviço 7, integrações 22); TypeScript, AST lint, build Vite, pacote ESM e contratos de integração aprovados.
- Chromium real: **19 módulos**, guia dentro do app abre/fecha e mostra endpoints, seleção de negócios, tela móvel e persistência local; nenhuma exceção JS durante o smoke.
- Rust/SQLite no runner Windows: **4/4 testes nativos**.
- Pacotes Windows: compilação Tauri x64, ZIP portátil e instalador Inno aprovados; dois ZIPs verificaram integridade e o manifesto SHA-256 foi validado contra os próprios bytes.
- [Artefato Windows final](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41518692636/artifacts/13177570965); [evidência visual Chromium](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41518692636/artifacts/13176441849).
- ZIP `Precify-Financy-2.1.0-win64.zip`: `d0d4b8443298c28f607aaca7f222f3acd2f39b33e1e6a5b506dbb919a573a511`.
- Instalador `Precify-Financy-2.1.0-setup.exe`: `c3e8842b222afe9f79d19eb7262bbe42cceafd477a54023fcdae135f4b3079a4`.

**Critério de saída:** regressões automatizadas e distribuição Windows aprovadas. Falta teste manual do novo binário no Windows/WebView2 e backend real da Vezura, portanto a PR continua draft, sem merge nem lançamento de produção.
