-- DESFAZ 2026-11-24_ranking_cidades_rapido.sql: volta a view v_ranking_cidades para a definição que estava no banco antes.
create or replace view exposicao_cearense.v_ranking_cidades as
select c.ano,
       c.id as credenciamento_id,
       m.nome as municipio,
       c.instituicao,
       count(v.produtor_id) as votos,
       rank() over (partition by c.ano
                    order by count(v.produtor_id) desc,
                             coalesce(sum(exposicao_cearense.peso_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0::numeric) desc,
                             coalesce(sum(exposicao_cearense.exposicoes_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0::bigint) desc) as posicao,
       coalesce(sum(exposicao_cearense.peso_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0::numeric)::numeric(10,1) as pontos,
       coalesce(sum(exposicao_cearense.exposicoes_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0::bigint)::integer as exposicoes_votantes
from exposicao_cearense.credenciamentos c
join exposicao_cearense.municipios m on m.codigo = c.municipio_codigo
left join exposicao_cearense.votos_cidades v on v.credenciamento_id = c.id
where c.apresentou
group by c.ano, c.id, m.nome, c.instituicao;
