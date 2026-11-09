-- Ranking das exposições: além da média, mostra o somatório de todas as notas recebidas (pontos).
-- A ordem continua pela média (desempate: perguntas 2, 5 e 9).
set search_path to exposicao_cearense;
create or replace view v_ranking as
with notas as (
  select q.exposicao_id,
         sum(r.nota) as pontos,
         avg(r.nota) filter (where q.ordem = 2) as p2,
         avg(r.nota) filter (where q.ordem = 5) as p5,
         avg(r.nota) filter (where q.ordem = 9) as p9
  from respostas r join perguntas q on q.id = r.pergunta_id
  group by q.exposicao_id
),
base as (
  select e.ciclo_id, e.id as exposicao_id, e.nome,
         count(a.produtor_id) as questionarios,
         avg(a.media) as media_exata
  from exposicoes e
  left join avaliacoes a on a.exposicao_id = e.id
  group by e.ciclo_id, e.id, e.nome
)
select b.ciclo_id, b.exposicao_id, b.nome, b.questionarios,
       round(b.media_exata, 2) as media,
       round(n.p2, 2) as media_p2,
       round(n.p5, 2) as media_p5,
       round(n.p9, 2) as media_p9,
       rank() over (partition by b.ciclo_id order by b.media_exata desc nulls last,
                    n.p2 desc nulls last, n.p5 desc nulls last, n.p9 desc nulls last) as posicao,
       coalesce(n.pontos, 0) as pontos
from base b left join notas n on n.exposicao_id = b.exposicao_id;
