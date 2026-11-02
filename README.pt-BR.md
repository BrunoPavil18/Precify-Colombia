# Precify Financy 🇨🇴



[Español](README.md) · [Português](README.pt-BR.md) · [English](README.en.md)

**Desenvolvimento da 2.1.0 (NÃO lançada) · Última versão estável: 2.0.1 · Apache License 2.0**


## Redesign dark-first 2.1.0 — entrega consolidada (candidata)

Foi implementado o painel com fundo **Jet Black `#121212`**, navegação por tarefas, nova **Visão Geral**, acesso direto a COD/CAC/CPA/PUM, catálogo pesquisável, relatórios com filtros, microanimações normais por padrão e menu mobile. Os cálculos e o funcionamento offline foram preservados. **108 testes automatizados** e aceitação real no Chromium (19 rotas, salvamento e recarga) aprovados. [Relatório da entrega](docs/REDESIGN_DELIVERY_V2_1_0.md) · [Evidência do CI](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41323103932). A branch continua não publicada e não altera a Vezura.

## Desenvolvimento da 2.1.0 — ainda não homologada

Esta branch acrescenta precificação nativa em moedas ISO, cotações indicativas diárias com cache offline, catálogo internacional independente, funil COD, matriz CPA, importação CSV, dashboards e uma API REST opcional com organizações, permissões, webhooks assinados e Facebook Ads. Também oferece calculadora incorporável por iframe (`?embed=1`), utilizável na Vezura e em outros sites, **sem modificar o repositório da Vezura**. Os serviços conectados dependem de PostgreSQL/Supabase, credenciais da Meta e testes externos; não estão prontos para produção. [Checkpoints](docs/EXECUTION_CHECKPOINTS_V2_1_0.md) · [Integração](docs/CONNECTED_API_V2_1_0.md).

## Sincronização local-first por loja (candidata 2.1.0)

O módulo **Conexões → Sincronização com lojas próprias** conecta um ou mais sites que disponibilizem o protocolo de alterações Precify v1. Cada loja **mantém os próprios pedidos e campanhas** e pode receber eventos enquanto o aplicativo está fechado. Depois da autenticação do usuário com token de leitura restrito, o Precify busca as alterações **ao abrir**, **a cada 60 segundos** (configurável: 30 s / 5 min / somente manual), **ao voltar à conexão** e pelo botão **Sincronizar agora**. Os relatórios COD lidos da loja são mantidos isolados por loja e conta no IndexedDB, apenas com consentimento, inclusive offline. Dados da loja não são transferidos automaticamente para o espaço local de lançamentos manuais.

A arquitetura é **genérica**, não exclusiva da Vezura: a loja precisa implementar `GET /precify/v1/identity` e `GET /precify/v1/changes` autenticados. O adaptador server-side está em `integrations/site-owned-feed.mjs`. **A Vezura ainda não implementa esse protocolo; não há sincronização comercial real ou hospedagem implantada nesta entrega.** O token de leitura fica apenas na sessão aberta; após reiniciar o aplicativo, é necessário autenticar-se novamente antes da sincronização automática. O cache local foi validado em Chromium real, inclusive ao recarregar o navegador e ao revogar consentimento; a API da Vezura continua pendente. No estágio atual, o aplicativo é uma **PWA web instalável**, não um executável nativo Windows com serviço em segundo plano. [Contrato e exemplos](docs/SITE_OWNED_SYNC_V2_1_0.md).

## Atualização 2.0.1

A v2.0.1 estabiliza campanhas (ROAS atribuído e projetado separados), custos COD por etapa, PUM com **unidade do conteúdo e unidade de comparação escolhidas separadamente** (g/kg, ml/L, cm/m), equilíbrio exato da carteira e traduções ES/PT/EN. Backups v1/v2 e contratos antigos continuam compatíveis; chamadas antigas do PUM com três parâmetros mantêm a referência histórica. Consulte a [integração](docs/INTEGRATION_V2.md), a [legislação](docs/COLOMBIA_LEGAL_V2_0_1.md) e as [notas 2.0.1](docs/RELEASE_NOTES_2.0.1.md).


## Novidades da versão 2.0.0

A v2 mantém as funcionalidades da v1 e adiciona simulações de **risco COD** (pedidos criados, enviados, entregues e pagos), **publicidade/CAC/ROAS**, **preço por unidade de medida** (kg, L, m e unidade), **prévia de preço ao consumidor** (tributos incluídos ou adicionais) e **carteira de produtos** com despesas fixas descontadas uma única vez. As simulações são armazenadas por seção e incluídas no backup JSON v2; arquivos v1 continuam importáveis. Novas métricas distinguem bases de margem e markups; contribuição igual a zero não é classificada como sustentável. A interface ganha percentuais localizados, modais de confirmação próprios, PWA com recursos offline e atualização mediante escolha do usuário. Impostos e taxas permanecem configuráveis e ilustrativos.


Aplicação independente de precificação em **pesos colombianos (COP)**, com custos, frete, publicidade, taxas, reservas de pagamento contra entrega (COD), margens, descontos, preço recomendado, metas, ponto de equilíbrio, catálogo, cenários, relatórios e backups. Interface disponível em espanhol colombiano, português brasileiro e inglês.

## Onde ficam os dados?

**No navegador de cada pessoa**, usando `localStorage` e a chave `precify-financy:workspace:v1`. Os seus dados de teste **não vão para o GitHub e não entram no build distribuído**. Em um navegador/origem sem dados, o catálogo começa vazio. O nome “Produto de exemplo” é só um rascunho inicial, não um produto cadastrado.

Os dados ficam associados à origem do site (protocolo, domínio e porta) e ao perfil do navegador. Quem compartilhar o mesmo perfil e origem pode acessar os mesmos dados; isso **não é armazenamento multiusuário** nem sincronização. Limpar dados do navegador, mudar de dispositivo ou usar aba anônima pode resultar em perda de informações. Use **Dados → Baixar backup** regularmente. O aplicativo não envia os dados para um backend próprio.

## Instalação para desenvolvimento

Requisitos: **Node.js >=20.19**, **pnpm 10.34.7** e Git.

```bash
git clone https://github.com/BrunoPavil18/Precify-Colombia.git
cd Precify-Financy
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Acesse o endereço exibido pelo Vite (normalmente `http://127.0.0.1:5173/`). No PowerShell, use `pnpm.cmd` se necessário. Se `corepack enable` falhar com EPERM no Windows, configure os shims do Corepack em uma pasta do seu usuário; não é preciso usar administrador apenas para alterar arquivos do Node em Program Files.

### Testes e distribuição

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:core
pnpm audit --audit-level moderate
```

O comando `pnpm lint` executa um verificador AST independente baseado em TypeScript, além do typecheck; não é ESLint/Biome.

## Uso e configuração

Na Calculadora, informe custos de aquisição, embalagem, frete, publicidade, comissões, reserva COD, descontos, margem-alvo e arredondamento. IVA e outras taxas são **hipóteses inseridas manualmente**, nunca tributos presumidos. Confira o enquadramento com profissional habilitado na Colômbia.

Valores exibidos: `89.900,50` COP. Valores passados ao motor: `89900.50` (sem separador de milhar). Percentual `3.00` significa 3%. Alterar idioma **não** muda COP, fórmulas nem produtos cadastrados.

Em **Produtos**, salve e duplique produtos e reutilize perfis de custo. **Cenários** compara hipóteses sem alterar o original. **Metas** permite selecionar o produto salvo e modificar somente despesas fixas/unidades mensais. **Relatórios** exporta CSV. **Dados** exporta/importa backups JSON versionados (limite de 2 MB). O arquivo de backup mantém `currency: COP` e `locale: es-CO` como contrato de formato, mesmo com interface PT/EN.

## Integrar com outros sistemas

### Aplicação inteira no WordPress, Node.js ou site existente

Hospede a pasta `apps/web/dist/` em `https://calculadora.exemplo.com/` e insira numa página:

```html
<iframe
  src="https://calculadora.exemplo.com/"
  title="Precify Financy"
  loading="lazy"
  style="width:100%;height:850px;border:0"
></iframe>
```

No WordPress, cole em um bloco **HTML personalizado** quando permitido, ou adicione um link para a calculadora. Configure CSP `frame-ancestors` / `X-Frame-Options` no servidor para permitir a incorporação apenas pelo domínio desejado. **A integração por iframe não conecta produtos, usuários, bancos de dados nem sessões do WordPress.** Os dados continuam vinculados à origem do iframe e podem sofrer limitações de cookies/armazenamento de terceiros.

### Reutilizar o motor em TypeScript/Node.js

O pacote `packages/core` exporta `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice` e outras funções, sem React:

```ts
import { EMPTY_INPUT, analyze, suggestPrice } from "@precify-financy/core";

const produto = { ...EMPTY_INPUT, acquisition: "37000.00", currentPrice: "99000.00" };
const resultado = analyze(produto);
console.log(resultado.contribution); // "49000.00" com os demais custos de exemplo
console.log(suggestPrice(produto).price);
```

Dentro deste monorepo pnpm, use `"@precify-financy/core": "workspace:*"`. Na v2.0.0, o core compila ESM em `packages/core/dist/index.js` e tipos em `dist/index.d.ts`. Execute `pnpm --filter @precify-financy/core build` e `pnpm verify:core`. **O pacote não está publicado no npm**; a integração externa exige empacotamento/teste local ou incorporação da fonte sob Apache 2.0. Não existe plugin WordPress ou API HTTP oficial.

Para importar dados de loja, converta o modelo da plataforma para o tipo `PriceInput`, valide com `validateInput` e execute `analyze`. Nunca exponha credenciais ao cliente nem altere preços de lojas sem autorização.

Leia [contrato de integração](docs/INTEGRATION_CONTRACT.md), [fórmulas](docs/FINANCIAL_FORMULAS.md), [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY_AUDIT.md) e [licença Apache 2.0](LICENSE).

**Limitações:** somente COP; armazenamento local por navegador; sem login, backend, sincronização, integração comercial automática, checkout ou plugin WordPress. Resultados não substituem assessoria contábil/tributária. A licença de código não concede direitos sobre marcas de terceiros.

## Documentación técnica v2 / Technical v2 documentation

- [Integration API v2](docs/INTEGRATION_V2.md)
- [Colombian legal references](docs/COLOMBIA_LEGAL_V2.md)
- [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [v2 release notes](docs/RELEASE_NOTES_2.0.0.md)

## Precify Desktop Tauri e negócios independentes (candidata 2.1.0)

O núcleo financeiro **permanece em TypeScript/BigInt** para preservar equivalência com a PWA. O aplicativo Windows usa Rust para a janela nativa e snapshots SQLite por negócio; o armazenamento ativo da interface continua no navegador integrado até uma migração explícita. É possível criar negócios independentes e abrir a visão "Todos os negócios", sem inventar lucros nem somar moedas diferentes. [Análise técnica](docs/FINANCIAL_ENGINE_RUST_DECISION_2026-11-02.md) · [Guia e limitações](docs/MULTI_BUSINESS_DESKTOP_V2_1_0.md). A Vezura não foi alterada.


## Precify Financy — Windows SQLite e integração direta por instalação

A versão Windows usa o Tauri 2, motor financeiro TypeScript/BigInt e **SQLite como armazenamento autoritativo** de perfis, catálogo COP, cenários, operações, preços ISO e configuração de lojas. O estado síncrono do React usa uma projeção descartável em localStorage, carregada do SQLite ao iniciar. Gravações financeiras confirmam primeiro o banco; falhas não resultam em mensagem falsa de sucesso. O site continua sendo a fonte oficial de pedidos/recebimentos importados.

**Instalação limpa:** o identificador Tauri agora é `com.precifyfinancy.desktop` e o instalador Inno usa novo `AppId`. Isso evita sobrescrever a instalação antiga do Precify Colombia e não importa automaticamente produtos de desenvolvimento. A versão web continua usando seu armazenamento específico. O usuário pode exportar/importar JSON explicitamente, se desejar.

As lojas emitem convites de uso único para cada instalação: o computador gera uma chave Ed25519 privada não exportável pelo WebCrypto e lê a API v2 do próprio site por HTTPS, com assinatura, nonce, timestamp e revogação por dispositivo. O código do convite é consumido uma única vez. Veja [protocolo de lojas e exemplos MySQL/Postgres](docs/STORE_DEVICE_API_V2.md).

**Pendências externas:** o servidor de cada loja precisa instalar a API, fornecer o feed durável de pedidos e oferecer um painel administrativo para emissão/revogação. Nenhuma alteração na Vezura nesta entrega. O nome do repositório GitHub ainda é `Precify-Colombia` por limitação do conector de administração; o proprietário deve alterá-lo em Settings → General → Repository name para `Precify-Financy` quando homologar, mantendo os redirecionamentos antigos.
