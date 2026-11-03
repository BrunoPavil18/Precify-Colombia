# Vezura Store → Precify Financy 2.1.0 — integração em código concluída

**Atualização de 02/11/2026:** o backend real da Vezura foi implementado e integrado à `main` pela [PR #118](https://github.com/Gabriel-Michalizsen/vezura-store/pull/118), com os endpoints v2, login administrativo, convites e revogação, outbox transacional e feed cursorizado. **Ainda NÃO foi aplicada a migration 025 na Hostinger, nem habilitada a flag de API, nem homologado o Windows com a loja real.** O código está integrado, mas não há afirmação de comunicação de produção até esse teste.

**Diferença importante da integração genérica:** usar `database/025_precify_financy_device_v2.sql` do repositório Vezura, **não** aplicar em paralelo a migração de exemplo `integrations/sql/precify-financy-device-v2.mysql.sql` do Precify. A migration da Vezura já contém convites, dispositivos, nonces, rate limits, sequenciador e outbox; aplicar ambas como se fossem partes complementares pode causar conflito.

**Handoff de teste:** depois de backup e migration 025 aplicados **manualmente**, configure `VEZURA_PRECIFY_DEVICE_API_ENABLED=1` e `VEZURA_PRECIFY_ALLOWED_ORIGINS=http://tauri.localhost` (ou origem do Windows real), atualize a Vezura e visite `/admin/financeiro`. Gere convite de 10 minutos, adicione `https://vezura.store` no Precify Windows 2.1, ative e execute `Sincronizar agora`. Valores não conciliados aparecem sem estimativa de lucro. Consulte `docs/VEZURA_PRECIFY_FINANCY_V2_INTEGRATION.md` **na Vezura** para instruções completas.

**Contabilidade:** neste primeiro contrato só são expostos eventos de intenções confirmadas na Mastershop como `created`, além de cancelamentos explicitamente registrados, não eventos de `paid`. Custos não comprovados são sinalizados por `financialCompleteness:"operational_only"`; o aplicativo v2.1 deixa o resultado financeiro indisponível, em vez de tratar custo desconhecido como zero real.



## 1. Contrato financeiro real

A Vezura já utiliza MySQL para pedidos COD, intents, transições e inbox de webhooks Mastershop. Esses eventos são candidatos à alimentação de um **outbox durável**, mas não provam que o pagamento foi recebido. Mapear por evento: pedido criado, enviado, entregue, pago/confirmado, recusado, reembolsado, devolvido; receita efetivamente recebida, custos de produto, frete, logística reversa, taxas, CAC e publicidade, sempre declarando proveniência. Não transmitir comprador, endereço, telefone, CPF ou outros dados pessoais no feed para análise financeira. Valores desconhecidos não devem virar zero presumido.

## 2. Vínculo por instalação (protocolo v2 aprovado)

- Aplicar **somente na base de staging da Vezura e depois do backup/revisão**: `database/025_precify_financy_device_v2.sql` da própria Vezura. Não aplicar simultaneamente a migração genérica de exemplo.
- O backend equivalente já foi implementado diretamente no Next.js da Vezura (`src/lib/precify/device-api.ts` e `device-store.ts`) com o mesmo contrato público v2. Não é necessário importar os módulos Node ESM genéricos durante o deploy.
- Expor `POST /precify/v2/activate`, `GET /precify/v2/identity` e `GET /precify/v2/changes`. Um convite aleatório gerado no admin autenticado deve ser salvo **somente como hash**, expirar rapidamente e ser consumido uma única vez com transação e UNIQUE. Um segundo computador com o mesmo código recebe 409. Gerar convites independentes para permitir vários colaboradores na mesma loja.
- Implementar tela administrativa na Vezura para criar códigos e revogar dispositivos. Revogação é **server-side**; remover a conexão local do Precify não revoga o acesso remoto.
- Verificar assinatura Ed25519, timestamp (janela ±120 segundos), nonce único, escopo `finance:read`, tenant e status da revogação em **todas as consultas**. Adotar rate limiting e registro de auditoria. Somente HTTPS e CORS com origens explícitas da PWA/WebView2, nunca curinga.
- Não compartilhar uma API key global entre todos os Precify, não criar base de usuários central só para o Precify e não expor credenciais Mastershop/Hostinger ao aplicativo.

## 3. Feed durável

Construir consultas read-only de `readChanges({subject,cursor,limit})` sobre transações/outbox ordenados. Os cursores precisam ser opacos, monotônicos e separados por negócio autorizado; devem suportar dispositivos offline e retorno após vários dias. Não deduzir pagamentos de 'enviado' ou 'entregue'. Preservar IDs de eventos estáveis e imutáveis; retornos/tombstones exigem contrato explícito.

## 4. Testes finais (staging, antes de produção)

1. Emitir convites distintos para duas instalações; ambas sincronizam só o negócio autorizado.
2. Reusar o mesmo convite em outra instalação: **HTTP 409**, sem novo dispositivo.
3. Revogar uma instalação no admin: próximas chamadas assinadas são negadas; a outra continua ativa.
4. Reexecutar request antiga: nonce repetido/assinatura inválida falha; timestamp expirado é recusado.
5. Desligar computador, gerar pedidos/transições reais ou de sandbox na Vezura, religar e confirmar retomada exata do cursor sem duplicação ou lacunas.
6. Conferir monetário COP e moedas ISO sem somas transversais, eventos não conciliados e custos desconhecidos, com auditoria independente.
7. Conferir CORS no Windows WebView2 real e PWA; medir latência, recuperação de falhas, atualização/remoção e preservação SQLite após reinício.
8. Validar política de retenção, expurgo de nonces expirados, rate limits, backups e acesso do administrador.

**Critério de conclusão:** não habilitar produção ou declarar lucro real antes da aprovação desses testes. O backend de conta opcional antigo e a API bearer v1 são compatibilidade, **não** o método recomendado para uma nova loja.

Documentação do servidor e contrato: [STORE_DEVICE_API_V2.md](STORE_DEVICE_API_V2.md) · [FINANCY_FINAL_AUDIT.md](FINANCY_FINAL_AUDIT.md).


## Extensão de catálogo publicado (nova candidata 03/11/2026)

A [PR Vezura #119](https://github.com/Gabriel-Michalizsen/vezura-store/pull/119), ainda **draft**, acrescenta o endpoint assinado `GET /precify/v2/catalog?page=N` sem migração MySQL adicional. A branch Precify 2.1 recebe lista de produtos **publicados/disponíveis**, armazena espelho local por negócio/loja em SQLite e apresenta a opção de iniciar simulação COP com custos não verificados. Contrato, limites, proteção de dados e passos de homologação estão no arquivo [VEZURA_CATALOG_MIRROR_V2_1_0.md](VEZURA_CATALOG_MIRROR_V2_1_0.md).

**Importante:** API v2 de dispositivos PR #118 e extensão do catálogo PR #119 são entregas separadas. Dispositivo ativado e 0 eventos financeiros NÃO significam catálogo zerado, mas os produtos só serão recebidos quando a extensão de catálogo for implantada no backend da loja. Não fazer merge/deploy/migration sem aceite.
