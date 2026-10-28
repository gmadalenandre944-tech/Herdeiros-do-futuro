# Roadmap

- [x] Acelerar carregamento: pedidos independentes em paralelo e eliminar leituras repetidas; 5 testes passaram, prévia sem erros
- [ ] Medir velocidade dos painéis com dados reais — bloqueado: sessão autenticada indisponível no serviço externo

- [ ] Gestão de alunos: ordenação A–Z automática, cache por utilizador, revalidação e alterações otimistas
- [ ] Isolamento de professores: scripts SQL de RLS, vistas e índices para execução pelo proprietário
- [ ] Verificar ordenação e reversão de alterações; teste autenticado externo bloqueado por ausência de sessão gerida

- [x] Mini pauta: os três trimestres editáveis e gravados por trimestre em `mini_pautas`
- [x] Mini pauta: guardar/carregar/eliminar no histórico (`mini_pautas_historico` — ver docs/sql/mini_pautas_historico.sql, a executar pelo proprietário)
- [x] Classes dos ecrãs de frequência e mini pauta lidas dos alunos de `alunos_ordenados` (vista vw_alunos_ordenados)
- [x] Nome de quem criou a conta visível no topo (cabeçalho de todas as páginas)
- [x] Documento renomeado para «Herdeiros do Futuro» em todo o sistema
- [ ] Frequência: carregar alunos por turma em ordem alfabética; numeração contínua ao adicionar; gravar em `frequencias`
- [ ] Matriz no painel do professor igual à do admin (tabela `matriz_escolar`), com baixar PDF e imprimir
- [ ] Criação de conta de professor gravada (professores / staff_profiles / user_roles)
- [ ] Boletins a funcionar e a gravar em `boletins`
- [ ] Mini pauta: apenas uma página de cálculo, modelo único e bonito

- [x] Rapidez entre páginas: conta e função lidas uma vez por sessão e partilhadas (medição com contas reais bloqueada: sem sessão no serviço externo)
- [x] Caminho alternativo pelo servidor quando a ligação direta falha ou demora mais de 12 s
- [x] Menos tentativas repetidas; Mini Pauta mostra erro com "Tentar de novo"
- [x] Frequência aceita alunos escritos à mão (linhas vazias ignoradas)
