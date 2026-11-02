# Precify Financy 2.1.0 — auditoria consolidada de código e entrega
**Data:** 2 de novembro de 2026  
**Branch:** `feat/precify-colombia-v2.1.0` (nome histórico da branch; manter enquanto PR #4 estiver aberta)  
**PR:** https://github.com/BrunoPavil18/Precify-Financy/pull/4 (draft, sem merge ou release)  
**Build de código homologado automaticamente:** https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41395935905  
**Auditoria de dependências:** https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41396477317

## Decisões confirmadas

- **Identidade:** `Precify Financy` nos metadados de pacote, interface, serviço, Tauri (`com.precifyfinancy.desktop`), executável `precify-financy.exe`, scripts e instalador Inno. A marca não é mais o nome comercial "Colombia"; o módulo de legislação e impostos colombianos continua existindo como funcionalidade.
- **Motor financeiro:** core `@precify-financy/core` em TypeScript + BigInt, preservando cálculos existentes. O React apenas apresenta a interface; migrar as fórmulas para Rust sem equivalência demonstrada não foi feito.
- **SQLite principal do aplicativo Windows:** `precify-financy-local.db` é a fonte autoritativa dos snapshots versionados por negócio (`workspace`, `operations`, `global-pricing`, `site-connectors`, `business-directory`); o commit em SQLite antecede a projeção síncrona de leitura em localStorage, com proteção otimista contra conflitos. O feed de sincronização usa **o mesmo arquivo**, em tabelas SQLite transacionais de cursores/eventos e com isolamento por negócio.
- **Web/PWA:** continua com IndexedDB e armazenamento web sem exigir instalação Windows. `localStorage` no Tauri funciona como projeção descartável, não como segundo banco principal. Os `CryptoKey` Ed25519 não exportáveis permanecem em IndexedDB no WebView2, como cofre de identidade, separado de dados financeiros.
- **Instalação limpa:** o identificador de aplicativo novo não importa nem apaga silenciosamente dados de testes da instalação antiga, pois o processo não tem acesso aos computadores do usuário. Nenhuma limpeza remota de arquivos pessoais foi realizada.
- **Equipe sem cadastro central:** cada computador cria par Ed25519, um convite aleatório do site é consumido **uma única vez** em transação no banco da própria loja (MySQL 8 ou PostgreSQL), o dispositivo é registrado e requisições são assinadas com timestamp/nonce. O servidor verifica escopos e revogação em toda requisição. Novas conexões usam `device-v2`; a API bearer v1 permanece apenas como compatibilidade documentada para conectores anteriores, não é emitida por padrão.
- **Limites de segurança explícitos:** convite de uso único não equivale a TPM/hardware attestation; copiar o perfil inteiro do WebView2 pode clonar uma identidade. Remover a conexão local não revoga o dispositivo no servidor: o admin da loja precisa revogar seu registro. O convite deve expirar, o endpoint de ativação precisa de rate limiting, HTTPS e CORS limitado a origens autorizadas (inclusive Tauri Windows quando aplicável).
- **Separação por loja:** identidade de negócio, catálogo e operações independentes; sem troca automática do perfil "Todos os negócios". A visão geral identifica dados informados/importados, sem vendê-los como lucro contábil certificado.

## Auditoria final: achados resolvidos

| Achado | Correção implementada | Evidência |
|---|---|---|
| Arquivos SQLite separados para projeções financeiras e feed | Caminhos nativos unificados em `precify-financy-local.db` | `native_snapshots.rs`, `site_sync.rs` |
| Feed de lojas ainda prioritariamente IndexedDB em execução Windows | `website-sync-db.ts` despacha as quatro operações ao Rust/Tauri; PWA retém IndexedDB | Teste estático de regressão e testes Rust |
| Cadastro de site limpava o formulário antes de confirmar o commit | `add()` aguarda `await update(...)` | `WebsiteSyncLab.tsx` |
| Excluir conexão aparentava revogar acesso remoto | Aviso claro ES/PT/EN e instrução de revogação no servidor | UI e `STORE_DEVICE_API_V2.md` |
| Contaminação de branding antigo no comentário de bootstrap | Comentário atualizado; metadata e UI já foram auditadas | `native-primary.ts` |
| Evidência antiga nos READMEs (108 testes; links de UI antigos) | Resumo de teste atualizado para 113 e link do gate final | README ES/PT/EN e changelog |
| Códigos legados de feed bearer v1 | Preservados como adaptador opcional de compatibilidade, sem uso ao cadastrar nova loja; não remover cegamente API usada por SDK/web anterior | `integrations/site-owned-sync.mjs` |

## Testes e distribuição reproduzíveis

- **118/118 testes JavaScript**: core 61, web 23, serviço 7, integração 22. TypeScript, lint AST, build frontend, core ESM e testes de navegador Chromium (19 rotas, responsividade, persistência e perfis) aprovados.
- **4/4 testes Rust**: snapshots SQLite por perfil, CAS/revisão e cache de feed atômico com cursor, isolado por loja e imutabilidade de eventos.
- **GitHub Actions Windows x64**: `precify-financy.exe` compilado, instalador Inno e ZIP portátil produzidos.
- **Auditoria de dependências**: `pnpm audit --audit-level moderate` => **No known vulnerabilities found**. Isso não certifica ausência de vulnerabilidades futuras ou de lógica de aplicação.
- **Artefato oficial**: `Precify-Financy-2.1-MultiBusiness-Tauri-Windows`, [GitHub Actions](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41395935905/artifacts/13119407755).
- **SHA-256 do ZIP** `Precify-Financy-2.1.0-win64.zip`: `cb0f6b967261cd11be41c2a0a15509baa69e010c51e4000270492f3043f3ff3e`.
- **SHA-256 do Inno** `Precify-Financy-2.1.0-setup.exe`: `f0e9d8fe863f60ce8885951238ace79e063f70b822c29df80bd5f74b76051d4f`.
- Manifesto SHA256SUMS conferido byte a byte; ZIP externo e interno passaram em testes de integridade.

## Limites e o que depende da Vezura/loja real

**Não foi integrado ou publicado o backend da Vezura**, nem realizadas operações reais com pedidos, emissão de convite no admin da Vezura, CORS WebView2 em produção, webhooks, Meta Ads em produção ou revogação real no site. A implementação do servidor da loja deve aplicar o SQL MySQL 8, gerar convite temporário no admin, configurar origens e permissões, ligar feed durável e testar 2 instalações concorrentes e bloqueio de código usado. A aplicação permanece em branch/PR draft.

O protocolo é independente de uma loja; Vezura será apenas o primeiro adaptador real. Não existe exigência de um banco de usuários central no Precify para compartilhar dados via servidor da loja.

**Observações para release:** ainda não houve execução manual do novo binário com loja conectada no notebook do responsável; WebView2 precisa estar disponível, o EXE é não assinado digitalmente, e atualizações automáticas assinadas não foram ativadas. Não prometer controle físico inviolável do dispositivo, conformidade fiscal/jurídica completa, nem capacidade de revogação de dados já copiados offline.

## Única intervenção administrativa externa ainda pendente

O repositório foi **renomeado pelo proprietário** para `BrunoPavil18/Precify-Financy`. A branch `feat/precify-colombia-v2.1.0` preserva provisoriamente seu nome histórico enquanto a PR #4 estiver aberta; não renomear a head da PR durante revisão. Links antigos são redirecionados pelo GitHub.

## Critério de saída

**Engenharia local e de protocolo: candidata validada automaticamente**. Faltam aceitação/integração real da API da loja (incluindo pedidos, credenciais e revogação), homologação definitiva na Vezura e os procedimentos administrativos de nome/release. Não declarar 100% de produção antes disso.

## Auditoria geral complementar — 02/11/2026

A revisão completa dos fluxos de conexão, operações multiempresa, recuperação de SQLite, READMEs e integração Vezura foi registrada em [GENERAL_AUDIT_V2_1_0_2026-11-02.md](GENERAL_AUDIT_V2_1_0_2026-11-02.md). Os 118 testes JavaScript e o fluxo Chromium de 19 módulos, incluindo onboarding v2, foram aprovados em [Actions #41400054914](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41400861130). O módulo antigo de contas permanece acessível apenas na área avançada opcional; v1 é compatibilidade e não o padrão para novos sites.

### Complemento de isolamento no modo conectado opcional

O upload para a API antiga utilizava equivocadamente a chave do negócio principal. A nova leitura utiliza o escopo de negócio ativo e só permite a importação após confirmação explícita de negócio local e organização remota. Regressão adicionada aos testes web. [Auditoria geral e limites](GENERAL_AUDIT_V2_1_0_2026-11-02.md).
