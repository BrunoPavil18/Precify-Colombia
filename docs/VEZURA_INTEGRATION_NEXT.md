# Vezura Store → Precify Financy 2.1.0 — fase de homologação de integração

**Estado (02/11/2026):** adaptadores da API de dispositivos v2, esquema MySQL 8, cliente Tauri/PWA e testes de protocolo implementados no Precify. A Vezura ainda não recebeu migrações ou deploy e nenhum pedido real foi homologado. Implementar em uma branch separada de Vezura, com aprovação de alterações no banco e staging.

## 1. Contrato financeiro real

A Vezura já utiliza MySQL para pedidos COD, intents, transições e inbox de webhooks Mastershop. Esses eventos são candidatos à alimentação de um **outbox durável**, mas não provam que o pagamento foi recebido. Mapear por evento: pedido criado, enviado, entregue, pago/confirmado, recusado, reembolsado, devolvido; receita efetivamente recebida, custos de produto, frete, logística reversa, taxas, CAC e publicidade, sempre declarando proveniência. Não transmitir comprador, endereço, telefone, CPF ou outros dados pessoais no feed para análise financeira. Valores desconhecidos não devem virar zero presumido.

## 2. Vínculo por instalação (protocolo v2 aprovado)

- Aplicar **somente na base de staging da Vezura, com revisão**: `integrations/sql/precify-financy-device-v2.mysql.sql`, usando as tabelas da loja para convites, dispositivos e nonces.
- Integrar `createMySQLDeviceStore(pool)` ao handler `createDeviceFeedHandler` de `integrations/device-feed.mjs`.
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
