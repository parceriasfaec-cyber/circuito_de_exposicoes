-- Ranking das cidades mais rápido: o peso do voto (1.0 a 1.9) e o número de exposições de quem votou passam a ser
-- calculados UMA vez por produtor, em vez de chamar peso_voto_cidade() e exposicoes_voto_cidade() uma vez por voto.
-- Mantém as mesmas colunas e os mesmos desempates (votos, depois pontos, depois exposições dos votantes).
-- É tudo ou nada: se o ranking novo sair diferente do atual em qualquer linha, o script falha e NADA é alterado.
-- Rode inteiro no SQL Editor do Supabase. Todos os nomes levam o schema exposicao_cearense na frente (não depende de search_path).
-- Versão: v2 (a primeira linha de código é 'begin;').
begin;

create index if not exists votos_cidades_credenciamento_ix on exposicao_cearense.votos_cidades (credenciamento_id);
create index if not exists participacoes_produtor_ix on exposicao_cearense.participacoes (produtor_id);

-- guarda o ranking de hoje para comparar
create temp table _ranking_antes on commit drop as select * from exposicao_cearense.v_ranking_cidades;

create or replace view exposicao_cearense.v_ranking_cidades as
with exp_por_produtor as (
  -- quantas exposições o produtor teve em cada ciclo (o voto do ano X usa o ciclo X - 1)
  select pa.produtor_id, ci.ano + 1 as ano_voto, count(*)::int as n
  from exposicao_cearense.participacoes pa
  join exposicao_cearense.exposicoes e on e.id = pa.exposicao_id
  join exposicao_cearense.ciclos ci on ci.id = e.ciclo_id
  group by pa.produtor_id, ci.ano
),
votos as (
  select v.credenciamento_id, v.produtor_id,
         coalesce(x.n, 0) as n,
         case when coalesce(x.n, 0) <= 1 then 1.0 else 1 + x.n / 10.0 end as peso
  from exposicao_cearense.votos_cidades v
  left join exp_por_produtor x on x.produtor_id = v.produtor_id and x.ano_voto = v.ano
)
select c.ano, c.id as credenciamento_id, m.nome as municipio, c.instituicao,
       count(v.produtor_id) as votos,
       rank() over (partition by c.ano
                    order by count(v.produtor_id) desc,
                             coalesce(sum(v.peso), 0) desc,
                             coalesce(sum(v.n), 0) desc) as posicao,
       coalesce(sum(v.peso), 0)::numeric(10,1) as pontos,
       coalesce(sum(v.n), 0)::integer as exposicoes_votantes
from exposicao_cearense.credenciamentos c
join exposicao_cearense.municipios m on m.codigo = c.municipio_codigo
left join votos v on v.credenciamento_id = c.id
where c.apresentou
group by c.ano, c.id, m.nome, c.instituicao;

-- confere: o ranking novo tem que ser idêntico ao de antes (senão cancela tudo)
do $$
begin
  if exists (
    (select * from _ranking_antes except select * from exposicao_cearense.v_ranking_cidades)
    union all
    (select * from exposicao_cearense.v_ranking_cidades except select * from _ranking_antes)
  ) then
    raise exception 'O ranking novo ficou diferente do atual. Nada foi alterado.';
  end if;
end $$;

commit;
