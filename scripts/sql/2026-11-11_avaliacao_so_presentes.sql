-- Opção em Prazo e horário: a avaliação das exposições pode ficar só para quem teve a presença marcada.
-- Começa desligada (todos podem avaliar, como antes).
alter table exposicao_cearense.votacao add column if not exists exposicoes_so_presentes boolean not null default false;
