# Precify Financy 2.1 — Vezura: catálogo publicado em espelho local

**Estado:** entrega de código em PR #4 (Precify) e PR #119 (Vezura), **sem merge da PR #119 nem deploy automático na loja**.

## Como funciona

1. A instalação já autorizada na loja por convite Ed25519 faz `GET /precify/v2/catalog?page=1..N` assinado, usando a mesma identidade Device API v2 do feed financeiro.
2. A Vezura usa o **mesmo critério público da vitrine** para retornar somente produtos vendáveis publicados, com identificador estável, nome, slug, moeda, preço e imagem pública. Não fornece custo real, taxas ou PII.
3. O cliente verifica TODAS as páginas, quantidade, formato, limites e IDs duplicados antes de gravar. Caso haja erro, mantém a versão local anterior e sinaliza a falha.
4. O espelho é salvo separadamente em `catalog-mirror`, por negócio e por loja, no SQLite nativo (PWA: armazenamento do navegador). NÃO se mescla automaticamente com `Workspace.products` nem com eventos financeiros.
5. O usuário encontra o catálogo espelhado em **Produtos** e **Fontes e conexões**, com quantidade e horário da última atualização. Ele pode escolher **Criar simulação** para COP; isso abre um rascunho, não grava produto.
6. O rascunho usa SOMENTE nome e preço da loja. Todos os custos de exemplo são removidos. A calculadora apresenta aviso explícito, e a gravação fica bloqueada até o usuário confirmar manualmente as premissas e revisar os custos. O campo `origin` permanece `estimado`.
7. Sincronização do catálogo em intervalos no mínimo de cinco minutos (respeita o timer de pedidos mais frequente); **Sincronizar agora** sempre tenta atualizar. Se o backend ainda não tiver endpoint, o erro de catálogo é independente da sincronização de pedidos.
8. **Pausar** via consentimento não apaga cache. **Excluir conexão e cache** exige confirmação e apaga dados espelhados/eventos e chave local; revogação remota continua manual no painel da loja.

## Contrato e limites

- `/precify/v2/catalog` — Device API v2 assinada, read-only; versão 1 do payload; 24 itens por página.
- Publicação via snapshot completo paginado; não possui ainda cursor transacional estável. Alterações concorrentes detectáveis cancelam a atualização e preservam o espelho; mudanças mantendo o mesmo total podem exigir um ciclo posterior.
- Limites da candidata: até 2.400 produtos por resposta completa, até 1,9 MB de todos os espelhos de um mesmo negócio. Extrapolação falha explicitamente. Uma evolução em SQLite relacional pode remover o limite, mas não deve ser introduzida sem testes de migração.
- Loja só publica catálogo pelo deploy de sua PR. Não há SQL adicional ao schema atual de dispositivos da Vezura (migração 025).
- O backend da Vezura entrega custos **não verificados** no feed de pedidos. O Precify só mostra resultado líquido de um feed como verificado se a origem declarar explicitamente `financialCompleteness: 'verified'`. Pedidos confirmados em Mastershop não são pagamentos recebidos.
- O sistema antigo de contas e organizações permanece oculto/avançado por compatibilidade e não é necessário ao vínculo com a Vezura.

## Matriz mínima de QA antes do merge

- [ ] Web TypeScript/lint/build; testes core + catálogo JS + Chromium dos 19 módulos.
- [ ] Rust SQLite: catálogo-mirror na mesma base, separação entre dois negócios, reinicialização.
- [ ] Staging Vezura: dispositivo ativado, 0 eventos/mais de 0 produtos, importação de todos os produtos, despublicação, alteração de preço e volta após offline.
- [ ] Verificar que simulação de loja não sobrescreve um produto manual sem confirmação nem inventa custo real.
- [ ] Pausar/reabrir preserva espelho e cursor. Excluir com confirmação limpa os dados locais e exibe orientação para revogar dispositivo na loja.
- [ ] Confirmar rejeição 401/403/409 para assinatura inválida, dispositivo revogado e replay.
- [ ] Confirmar origem CORS permitida no WebView2, e HTTPS efetivo na Hostinger.
- [ ] Conferir o número do catálogo da vitrine contra o espelho; erros de paginação não podem marcar catálogo como atualizado.
- [ ] Validar integridade dos dados nativos após atualização do app.

**Não chamar isso de homologação de produção** sem passar os itens de staging/Windows. A main/instalação anterior deve ficar intacta.
