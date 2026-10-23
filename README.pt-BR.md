# Precify Colombia 🇨🇴

> **Precify Colombia 2.0.0:** integrado à `main` e homologado funcionalmente pelo mantenedor (53 testes automatizados aprovados). A tag/release v2.0.0 é publicada separadamente. Consulte o [estado técnico e limitações](docs/V2_STATUS.md).


[Español](README.md) · [Português](README.pt-BR.md) · [English](README.en.md)

**Versão 1.0.0 · Gratuito e open source · Apache License 2.0**

Aplicação independente de precificação em **pesos colombianos (COP)**, com custos, frete, publicidade, taxas, reservas de pagamento contra entrega (COD), margens, descontos, preço recomendado, metas, ponto de equilíbrio, catálogo, cenários, relatórios e backups. Interface disponível em espanhol colombiano, português brasileiro e inglês.

## Onde ficam os dados?

**No navegador de cada pessoa**, usando `localStorage` e a chave `precify-colombia:workspace:v1`. Os seus dados de teste **não vão para o GitHub e não entram no build distribuído**. Em um navegador/origem sem dados, o catálogo começa vazio. O nome “Produto de exemplo” é só um rascunho inicial, não um produto cadastrado.

Os dados ficam associados à origem do site (protocolo, domínio e porta) e ao perfil do navegador. Quem compartilhar o mesmo perfil e origem pode acessar os mesmos dados; isso **não é armazenamento multiusuário** nem sincronização. Limpar dados do navegador, mudar de dispositivo ou usar aba anônima pode resultar em perda de informações. Use **Dados → Baixar backup** regularmente. O aplicativo não envia os dados para um backend próprio.

## Instalação para desenvolvimento

Requisitos: **Node.js >=20.19**, **pnpm 10.34.7** e Git.

```bash
git clone https://github.com/BrunoPavil18/Precify-Colombia.git
cd Precify-Colombia
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
pnpm audit --audit-level moderate
```

O `lint` atualmente executa `tsc`, não um linter separado. O build de produção é gerado em **`apps/web/dist/`**; publique essa pasta em um host HTTPS para sites estáticos, com MIME e cabeçalhos de segurança apropriados. Não use o servidor `pnpm dev` como hospedagem de produção. Não é necessário backend, login ou serviço pago.

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
  title="Precify Colombia"
  loading="lazy"
  style="width:100%;height:850px;border:0"
></iframe>
```

No WordPress, cole em um bloco **HTML personalizado** quando permitido, ou adicione um link para a calculadora. Configure CSP `frame-ancestors` / `X-Frame-Options` no servidor para permitir a incorporação apenas pelo domínio desejado. **A integração por iframe não conecta produtos, usuários, bancos de dados nem sessões do WordPress.** Os dados continuam vinculados à origem do iframe e podem sofrer limitações de cookies/armazenamento de terceiros.

### Reutilizar o motor em TypeScript/Node.js

O pacote `packages/core` exporta `EMPTY_INPUT`, `validateInput`, `analyze`, `suggestPrice` e outras funções, sem React:

```ts
import { EMPTY_INPUT, analyze, suggestPrice } from "@precify-colombia/core";

const produto = { ...EMPTY_INPUT, acquisition: "37000.00", currentPrice: "99000.00" };
const resultado = analyze(produto);
console.log(resultado.contribution); // "49000.00" com os demais custos de exemplo
console.log(suggestPrice(produto).price);
```

Dentro deste monorepo pnpm, use `"@precify-colombia/core": "workspace:*"`. Na versão 1.0.0, **o pacote ainda não foi publicado no npm**, e seu `exports` aponta para fontes `.ts`. Em repositórios externos, incorpore o código-fonte sob Apache 2.0 e configure compilação/bundler; não presuma instalação pública por npm. Para WordPress/PHP nativo, é preciso criar um adaptador JavaScript ou serviço próprio: **não há plugin WordPress ou API HTTP oficial**.

Para importar dados de loja, converta o modelo da plataforma para o tipo `PriceInput`, valide com `validateInput` e execute `analyze`. Nunca exponha credenciais ao cliente nem altere preços de lojas sem autorização.

Leia [contrato de integração](docs/INTEGRATION_CONTRACT.md), [fórmulas](docs/FINANCIAL_FORMULAS.md), [arquitetura](docs/ARCHITECTURE.md), [segurança](docs/SECURITY_AUDIT.md) e [licença Apache 2.0](LICENSE).

**Limitações:** somente COP; armazenamento local por navegador; sem login, backend, sincronização, integração comercial automática, checkout ou plugin WordPress. Resultados não substituem assessoria contábil/tributária. A licença de código não concede direitos sobre marcas de terceiros.
