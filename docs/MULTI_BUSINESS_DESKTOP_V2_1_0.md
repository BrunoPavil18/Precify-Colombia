# Precify Colombia 2.1 — candidata desktop multinégocio
**Data:** 2026-11-02 · **Ramo:** `feat/precify-colombia-v2.1.0` · **PR #4 (draft)**

## Objetivos e resultado

1. **Escolha da tecnologia:** mantido núcleo financeiro TS/BigInt; Tauri 2/Rust para janela, SQLite e recursos nativos. [Análise da migração](FINANCIAL_ENGINE_RUST_DECISION_2026-11-02.md).
2. **Nova seleção de negócios** no cabeçalho: o usuário cria, seleciona e renomeia um negócio com nome e URL HTTPS opcional. É possível selecionar "Todos os negócios" para a visão consolidada.
3. **Isolamento de dados:** catálogo COP, cenários, simulações avançadas, operações CSV, preços ISO, conectores de sites e IndexedDB do feed pertencem ao perfil de negócio ativo. A conta conectada remota continua escopada por organização/autorização; tokens de feed não são armazenados em disco.
4. **Migração não destrutiva:** o negócio original `default` permanece nas **chaves históricas exatas**. Novos negócios recebem sufixos de escopo. Não há cópia automática da base anterior, reset, deduplicação implícita nem remoção de dados locais antigos.
5. **Visão geral todos os negócios:** total de perfis, produtos COP e cenários, cards por negócio e, quando houver operações importadas, painel **por moeda** com pedidos, pagos, recebimento líquido, custos operacionais declarados e resultado calculado. Não somamos moedas distintas e **não chamamos dados importados de lucro contábil ou saldo bancário**. Fontes com dados inválidos não são somadas. Dados de uma mesma fonte importados em dois perfis ainda podem gerar sobreposição: é necessário o dono evitar importar a mesma loja em duas contas; a deduplicação global robusta depende de IDs de loja externos.
6. **Navegação mais simples:** itens especializados sob "Mais ferramentas", barra inferior mobile (Início, Preço, Produtos, COD, Conexões), menu lateral com botão fechar; valores adaptativos para 390/375 px.
7. **Armazenamento SQLite no Windows:** snapshots de perfis e módulos no diretório de dados nativo, protegidos por revision/CAS. O frontend continua localStorage/IndexedDB até uma migração transacional futura. Recuperação do snapshot é **opt-in e confirmada**.
8. **PWA permanece funcional** e compatível com o motor atual; compilação Windows em Inno Setup e ZIP portátil com hashes SHA-256.

## Riscos explícitos e não incluídos

- O SQLite ainda **não é autoridade única**; cópias nativas podem ficar atrasadas se o processo terminar antes de uma gravação assíncrona. O frontend acusa conflitos e preserva os dados previamente existentes.
- Não instalar atualização automática Tauri sem chave de assinatura e canal de distribuição confiável; os scripts Inno/ZIP atuais são entrega manual verificável.
- Nenhuma alteração na Vezura, Hostinger, migrações Supabase ou contas Meta.
- O formulário de nome/URL **não conecta uma loja sozinho**: cada API precisa implementar protocolo e credenciais específicas.
- A Visão geral não cria lucros fictícios quando não existe importação de vendas/despesas.
- O installer/Inno e ZIP precisam de teste real no Windows (e WebView2 disponível). O ZIP não inclui WebView2 fixo/offline.
- A base de backup COP de cada negócio preserva o formato `schemaVersion:1`; perfis de negócios são um **diretório separado**, distinto dos antigos perfis de custos do produto.
- A futura migração ao SQLite autoritativo e integração remota por organização devem ser precedidas por teste de recuperação/rollback, consistência entre dispositivos e controle de concorrência.

## Protocolo de teste final da candidata

1. Abrir o ZIP: indicador **APP WINDOWS** deve aparecer; instalar via Inno também.
2. No negócio principal, salvar um produto. Criar novo negócio: seu catálogo deve começar vazio.
3. Salvar produto no segundo negócio, alternar de volta: primeiro negócio preservado.
4. Selecionar Todos os negócios: total de produtos e cenários correto; resultados financeiros identificados como importados, não como renda verificada.
5. Em cada negócio, backup COP e restauração; preferir exportação antes de recuperação SQLite.
6. Testar modo offline, retomar online, conectar site com token de leitura; ver feed e isolamento do cache por negócio.
7. Celular em 390/375 px, sidebar com botão de fechar, navegação inferior sem conteúdo cortado, teclado e orientação.
8. Não fazer merge/release antes de homologação manual.

## Evidência automática

O workflow `.github/workflows/precify-multi-business-candidate.yml` verifica motor TS, dicionários, build, navegador real (isolamento, persistência, 19 rotas, mobile, animações) e testes Rust/compilação Tauri + geração de ZIP/Inno. **Aprovar somente se ambos os jobs estiverem verdes**, e conferir hashes dos artefatos. Esta seção será atualizada após o gate concluído.

## Complemento de recuperação e portabilidade

- O diretório dos negócios também possui snapshot SQLite separado sob `business_id=default`, `kind=business-directory`. A recuperação é acionada explicitamente pelo botão de banco de dados no seletor de negócios.
- O ZIP é portátil **como executável**, mas seus dados persistentes não ficam dentro do diretório extraído: WebView2 e SQLite gravam no perfil de usuário do Windows. Migrar entre máquinas requer backup e restauração intencionais.
- O Windows WebView2 não está embutido em modo fixed runtime neste pacote. Em máquinas sem o runtime, instalar offline antes de executar.
- A visão financeira agregada é baseada em eventos locais declarados/importados, sem equivalência automática com extrato bancário nem deduplicação global certificada entre sites repetidos.

## Homologação automatizada final — Windows e navegador

**GitHub Actions:** https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41380518692 — **SUCESSO**, commit de aplicação `befd4d396d664574a47e3e59a17d8021a7a252d6`.

- Web/Chromium: 108 testes Node (61 core, 22 web, 7 serviço, 18 integração), typecheck, lint, build e navegador real. Confirma 19 módulos, tema Jet Black, criação e isolamento de 2 negócios, visão geral com 2 produtos, barra inferior e drawer mobile sem overflow a 390 px, persistência após reload e nenhuma exceção JavaScript.
- Rust/Windows: `cargo test` (SQLite CAS, isolamento e entradas inválidas), executável Tauri Windows x64 compilado.
- Empacotamento: Inno Setup e ZIP gerados como artefatos, SHA-256 conferidos.
  - Setup: `d19240c2d54da9d04651f60210de50609370a53f204efbde04bf3cf5109b7210`.
  - ZIP: `18437c32a70b1c0f63bb43cf3509eebe90a9e24971326b8cbcedc6e2b6ca175f`.
- **Ainda é necessário testar manualmente os perfis/SQLite no Windows**; o sucesso automático não substitui essa homologação. Sem publicação/merge/deploy; PR permanece draft.
