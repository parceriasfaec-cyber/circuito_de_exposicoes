-- Cada pessoa (CPF) só pode credenciar um município por ano.
set search_path to exposicao_cearense;
alter table credenciamentos add constraint credenciamentos_cpf_ano_uk unique (ano, cpf);
