-- CPF do responsável deixa de ser obrigatório no credenciamento (por enquanto).
-- Continua só com números quando preenchido, e o mesmo CPF não credencia dois municípios no mesmo ano
-- (vários credenciamentos sem CPF são aceitos: a regra unique ignora vazio).
set search_path to exposicao_cearense;

alter table credenciamentos alter column cpf drop not null;
