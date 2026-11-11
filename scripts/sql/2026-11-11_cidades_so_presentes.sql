-- Votação das cidades: regra "só quem teve a presença marcada" (soma com "só quem avaliou"). Começa desligada.
alter table exposicao_cearense.votacao add column if not exists cidades_so_presentes boolean not null default false;
