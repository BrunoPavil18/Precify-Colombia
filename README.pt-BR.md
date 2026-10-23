# Precify Colombia

Projeto open source Apache-2.0 e independente, com motor monetário em centavos BigInt e interface estática completa em espanhol colombiano, português brasileiro e inglês (menu ES/PT/EN). Inclui precificação, cadastro local de produtos, perfis, cenários, descontos, campanhas, IVA parametrizável, frete, COD estimativo, metas, exportação CSV/JSON e backup versionado.

**Status:** candidato 1.0.0; não homologado. Lockfile já foi gerado e versionado na branch. A compilação, testes e auditoria das novas traduções ainda dependem da execução local; fluxo completo no navegador segue em homologação.

Requisitos: Node >=20.19 e pnpm 10.34.7.

~~~sh
corepack enable
corepack prepare pnpm@10.34.7 --activate
pnpm install --lockfile-only --ignore-scripts
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
pnpm dev
~~~

A aplicação não exige chave de API, conta, backend ou serviço pago. A Vezura será apenas consumidora futura do core — nenhuma integração foi feita aqui.

Custos COD e tributários são **hipóteses**, não alíquotas/tarifas garantidas. Consulte contador colombiano antes de aplicações fiscais. Seus dados ficam no navegador: faça backup em Dados.
