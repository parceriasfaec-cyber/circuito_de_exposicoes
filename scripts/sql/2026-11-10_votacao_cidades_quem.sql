-- Quem pode votar nas cidades: todos os produtores do ciclo ou só quem avaliou alguma exposição do ciclo ativo.
set search_path to exposicao_cearense;
alter table votacao add column if not exists cidades_quem text not null default 'todos'
  check (cidades_quem in ('todos', 'avaliaram'));
