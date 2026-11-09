-- Apaga os dados de teste (pedido da organização em 2026-11-09).
-- Fica: as 9 exposições do Calendário Oficial 2026, perguntas, ciclos, municípios, prazos do credenciamento e administradores.
set search_path to exposicao_cearense;
delete from votos_cidades;
delete from credenciamentos;
delete from respostas;
delete from avaliacoes;
delete from participacoes;
delete from produtores;
delete from tentativas_codigo;
-- Exposições fora do calendário oficial (perguntas saem junto)
delete from exposicoes e using ciclos c
 where c.id = e.ciclo_id and c.ano = 2026 and e.municipio in ('Sobral', 'Iguatu', 'Limoeiro do Norte');
-- Votação fechada, sem código do dia
update votacao set aberta = false, fechada_em = now(), modo = 'exposicoes' where id = 1;
