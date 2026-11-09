-- Prazo do credenciamento: o organizador define no painel até que dia os municípios podem se cadastrar.
-- O formulário aceita cadastros até o fim desse dia (horário de Fortaleza).
set search_path to exposicao_cearense;
create table credenciamento_config (
  id smallint primary key default 1 check (id = 1),
  prazo date
);
alter table credenciamento_config enable row level security;
insert into credenciamento_config (id, prazo) values (1, null);

-- Dia em que os credenciados apresentam o vídeo ou a apresentação (aparece no quadro "Fique atento!").
alter table credenciamento_config add column data_apresentacao date;
update credenciamento_config set data_apresentacao = '2026-11-12' where id = 1;
