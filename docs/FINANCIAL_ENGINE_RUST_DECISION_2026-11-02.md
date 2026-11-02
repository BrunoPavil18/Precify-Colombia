# Decisão arquitetural — Motor financeiro TypeScript vs Rust
**Data:** 2026-11-02 · **Status:** aprovado para candidata 2.1.0 · **Escopo:** Precify Colombia somente.

## Resumo executivo

**Não migrar o motor financeiro inteiro para Rust agora.** O React é apenas a interface; o cálculo reside no pacote TypeScript compartilhado `@precify-colombia/core`. A implementação atual trabalha com **BigInt e centavos inteiros**, não com `number` de ponto flutuante nos totais. Portanto Rust **não resolveria um defeito existente de precisão**.

Manter o motor auditado em TypeScript e usar Rust nos componentes onde há ganho real imediato: janela Windows Tauri 2, banco SQLite nativo, acesso a recursos de sistema/arquivos, validação de snapshots e eventual processamento de grandes lotes. **Nenhuma fórmula monetária foi reescrita nesta entrega.**

## Matriz de decisão

| Critério | TS/BigInt atual | Migrar tudo para Rust | Decisão |
|---|---|---|---|
| Precisão monetária | Centavos inteiros exatos, arredondamento explícito | Exatos apenas se escolher inteiros/decimal corretamente | Empate para o domínio atual |
| Regressão de fórmula | Testes existentes: margem, IVA, descontos, COD, FX, PUM | Exige reescrever e validar cada regra e limite | TS |
| UX local | Cálculo instantâneo para simulações atuais | FFI/IPC introduz fronteira assíncrona | TS |
| PWA/web | Executa diretamente em qualquer navegador suportado | Exige WASM e manutenção de toolchain múltipla | TS |
| Tauri Windows | O JS executa em WebView2; Rust disponível por IPC | Possível para lotes grandes | Híbrido |
| Segurança | Validação de origem e de inputs, exatidão BigInt | Memory safety Rust não garante correção de negócio | Arquitetura e testes, não linguagem |
| Build/manutenção | Um núcleo utilizado por web, testes e futuro SDK | Duplicação do núcleo ou migração integral para Rust+WASM | TS |
| SQLite/recursos nativos | Precisa de camada native | Rust e SQLite encaixam naturalmente | Rust |

## Restrições de equivalência para qualquer port futuro

O limite monetário atual é `MAX_CENTAVOS = 100_000_000_000_000n`. Operações intermediárias multiplicam esses inteiros por taxas em pontos-base; não presumir que tipos numéricos de menor capacidade são seguros. Selecionar `i128` com verificações ou BigInt/Rust Decimal conforme o domínio e provar ausência de overflow. `rust_decimal` oferece precisão decimal, mas não reproduz automaticamente **as escolhas do nosso motor**.

Qualquer implementação Rust candidata deve provar paridade byte a byte nos **resultados canônicos de strings**, considerando:

- parse de valor, centavos e porcentagens, valores máximos e entradas inválidas;
- arredondamento comercial e de centavos, inclusive `ending-900` e `ending-990`;
- desconto fixo/percentual, frete cobrado, IVA ilustrativo extraído, deduções e reservas COD;
- margem sobre produto vs receita cobrada, markup, contribuição mensal e ponto de equilíbrio;
- períodos, taxas, reversas, pedidos pagos/devolvidos e CPA, ROAS;
- moeda ISO (0, 2 ou 3 casas), USD/EUR/COP etc. e não somar moedas sem conversão datada.

**Port incremental recomendado se necessário:** primeiro uma biblioteca Rust pura com vetores gerados pelo núcleo TS, testes de propriedade e fuzzing; comparar 100% da saída; só então testar desempenho p50/p95 de lotes reais e considerar uso seletivo via Tauri IPC/WASM. Não ligar motor Rust como autoridade enquanto não houver equivalência provada.

## Condições para reavaliar

1. Perfilamento real identifica operações financeiras acima de 50 ms p95 que afetam interação;
2. Lotes de dezenas de milhares de itens em que worker TS não atenda metas;
3. Demanda por núcleo nativo compartilhável com outras plataformas além de navegador;
4. Equivalência documentada e teste de migração com fallback TS operacional.

Não declarar speedup do Rust sem benchmark reproduzível na mesma máquina, com a mesma quantidade de entradas e as mesmas regras.

## Mudanças implementadas em Rust agora

- `apps/desktop/src-tauri/src/native_snapshots.rs`: SQLite no diretório de dados do aplicativo (não na pasta portátil), `journal_mode=WAL`, banco nativo de snapshots escopados por negócio.
- Chaves permitidas limitadas a `workspace`, `operations`, `global-pricing` e `site-connectors`, no máximo 2 MB por snapshot e JSON validado.
- Atualizações transacionais com revisão esperada (compare-and-swap), sem caminhos arbitrários ou comandos SQL vindos da UI.
- Testes Rust comprovando isolamento, CAS e rejeição de entradas inválidas.
- **Estado transitório: localStorage/IndexedDB permanece armazenamento ativo do frontend; SQLite é uma cópia de segurança nativa controlada, NÃO o único banco autoritativo.** O usuário pode escolher a recuperação. Uma eventual promoção para banco principal exigirá transação de migração e rollback.

## Referências técnicas
- [rust_decimal](https://docs.rs/rust_decimal/latest/rust_decimal/) — decimal exato, mas exige regras próprias de negócio.
- [Tauri 2: SQL](https://v2.tauri.app/plugin/sql/) — opções oficiais de armazenamento e permissão; usamos Rust com `rusqlite` para limitar operações expostas.
- [Tauri 2: updater](https://v2.tauri.app/plugin/updater/) — updates públicos assinados, não ativados nesta candidata por ausência de chaves definitivas.
