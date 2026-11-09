-- Prazo, dia das apresentações e vagas passam a ser guardados por ano do credenciamento.
-- O ano do credenciamento agora é automático: ano do ciclo ativo + 1.
-- (A coluna id fica só para a versão antiga do site continuar funcionando até a publicação; pode ser removida depois.)
set search_path to exposicao_cearense;
alter table credenciamento_config drop constraint credenciamento_config_pkey;
alter table credenciamento_config drop constraint credenciamento_config_id_check;
alter table credenciamento_config alter column id drop not null, alter column id drop default;
alter table credenciamento_config add column ano smallint;
update credenciamento_config set ano = 2027;
alter table credenciamento_config alter column ano set not null;
alter table credenciamento_config add primary key (ano);
