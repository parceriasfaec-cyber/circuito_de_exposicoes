-- Desempate da votação das cidades pela pontuação de quem votou.
-- Cada voto vale um peso conforme o número de exposições do produtor no Circuito do ano anterior (ciclo ano - 1):
--   9 exposições = 1.9, 8 = 1.8 ... 2 = 1.2; 1 exposição (ou nenhuma) = 1.0.
-- A posição continua sendo pelos votos; só entre cidades com os mesmos votos é que vale a maior pontuação.
set search_path to exposicao_cearense;

create or replace function peso_voto_cidade(p_produtor uuid, p_ano smallint)
returns numeric
language sql stable
set search_path to 'exposicao_cearense', 'pg_temp'
as $$
  select case when n <= 1 then 1.0 else 1 + n / 10.0 end
  from (select count(*)::int n from participacoes pa
        join exposicoes e on e.id = pa.exposicao_id
        join ciclos c on c.id = e.ciclo_id and c.ano = p_ano - 1
        where pa.produtor_id = p_produtor) t
$$;

create or replace view v_ranking_cidades as
select c.ano, c.id as credenciamento_id, m.nome as municipio, c.instituicao,
       count(v.produtor_id) as votos,
       rank() over (partition by c.ano
                    order by count(v.produtor_id) desc,
                             coalesce(sum(peso_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0) desc) as posicao,
       coalesce(sum(peso_voto_cidade(v.produtor_id, v.ano)) filter (where v.produtor_id is not null), 0)::numeric(10,1) as pontos
from credenciamentos c
join municipios m on m.codigo = c.municipio_codigo
left join votos_cidades v on v.credenciamento_id = c.id
where c.apresentou
group by c.ano, c.id, m.nome, c.instituicao;
