# Auditoria de sincronização Supabase

**Estado:** leituras de notas ligadas ao Supabase; a sincronização total ainda depende do DDL actual.  
**Âmbito:** código-fonte do ZIP fornecido; nenhuma escrita foi feita na base de dados.

## Correcções aplicadas

- Listagens e identificação de alunos passam a ler `vw_alunos_2026_2027`; IDs recebidos da vista são validados como UUID.
- Removidas as leituras directas à tabela física `alunos` nas ecrãs do encarregado e as subscrições Realtime à tabela física `students`.
- A resolução de aluno já não associa automaticamente qualquer utilizador ao primeiro registo da lista.
- Corrigido o nome singular `confirmacao` para a fonte plural onde aplicável; a associação de turma passa a usar `id`/`turma_id` da vista.
- Removidos fallbacks locais do histórico de boletins e do histórico de notas. Falhas de leitura/gravação são apresentadas, sem IDs fabricados ou mensagens de sucesso falsas.
- As rotas de matrícula, confirmação e decisão de estado falham antes de enviar payloads não confirmados; actualmente mostram uma mensagem explícita em vez de provocar erros PostgREST ou anunciar gravações inexistentes.
- Os painéis de desempenho e ranking do aluno deixaram de devolver listas vazias fixas: agora lêem `notas`, calculam médias por disciplina/aluno e propagam erros de leitura.
- A pauta geral e os uniformes continuam locais; removi os alunos de demonstração da pauta e acrescentei avisos visíveis de que estes dados não são sincronizados com o Supabase.
- Corrigidos erros de TypeScript que impediam a validação do frontend e removidas as chamadas tipadas incorrectamente num módulo legado sem consumidores.

## O que impede concluir a sincronização

1. A nota de introspecção histórica incluída no ZIP (7 de Outubro de 2026) diz que `matriculas` tinha `aluno_id` e `turma_id`, sem `estado`/`status`. Isso não é suficiente para gravar os campos de cadastro do formulário; pode estar desactualizado.
2. O endpoint PostgREST do projecto recusou a leitura do catálogo com **HTTP 401 — “Secret API key required”**. Não foram lidos registos pessoais nem usadas chaves privilegiadas.
3. O código activo não usa `pagamentos_propinas`; a tesouraria grava em `pagamentos`. Sem o DDL actual, não é seguro adivinhar qual tabela e quais colunas devem receber cada tipo de pagamento.
4. `SecretarioUniformes` e `AdminPautaGeral` continuam com estado/gravação em `localStorage`; uniformes precisa de uma tabela própria e a pauta requer decidir como as notas e disciplinas se relacionam com a tabela escolar. O ZIP não contém um contrato SQL suficiente para migrá-las com segurança.
5. `src/integrations/supabase/types.ts` contém tipos antigos para `alunos`/`students` e não descreve as cinco fontes oficiais. Deve ser regenerado a partir do esquema actual.

## Validação disponível

- A varredura do código de runtime não encontrou chamadas directas `.from("alunos")`, `.from("students")` nem subscrições Realtime a `students`.
- A instalação filtrada do frontend e da biblioteca de workspace concluiu (314 pacotes); `pnpm --filter @workspace/herdeiros-futuro typecheck` passou.
- A instalação integral do monorepo continua bloqueada pelo registry com **403** em `proxy-addr@2.0.7`, dependência transitiva de Express 5.2.1 (já a versão mais recente verificada). Não alterei o servidor/API para contornar o bloqueio, pois não é dependência do frontend.
- O build Vite chegou a transformar 2.959 módulos, mas o ambiente terminou o processo com `SIGKILL` antes de produzir o pacote; o build não está validado.
- Não foi possível validar requests reais contra o Supabase nem confirmar que a migração de pagamentos está aplicada.

## Próximo passo necessário

Anexar o DDL/export **apenas de esquema** (sem linhas de dados, chaves ou credenciais) de `matriculas`, `confirmacoes`, `pagamentos`, `pagamentos_propinas` e `vw_alunos_2026_2027`. Com isso, é possível concluir os payloads, regenerar tipos, activar novamente matrícula/confirmação/estado e encaminhar cada pagamento para a tabela certa. Para uniformes, indicar também se já existe uma tabela própria e o respectivo DDL.
