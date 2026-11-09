-- Só entram na votação das cidades os municípios que realmente fizeram a apresentação.
-- O organizador marca no painel (Credenciamento) quem se apresentou.
set search_path to exposicao_cearense;

alter table credenciamentos add column apresentou boolean not null default false;

create or replace function votar_cidades(p_produtor uuid, p_ano smallint, p_ids uuid[])
returns void
language plpgsql
set search_path to 'exposicao_cearense', 'pg_temp'
as $function$
begin
  if not coalesce((select aberta and modo = 'cidades' from votacao where id = 1), false) then
    raise exception 'A votação das cidades está fechada';
  end if;
  if array_length(p_ids, 1) is distinct from 2 or (select count(distinct x) from unnest(p_ids) x) <> 2 then
    raise exception 'Escolha exatamente 2 cidades diferentes';
  end if;
  if (select count(*) from credenciamentos where ano = p_ano and apresentou and id = any(p_ids)) <> 2 then
    raise exception 'Cidade inválida';
  end if;
  perform pg_advisory_xact_lock(hashtext('votos_cidades|' || p_produtor::text));
  if exists (select 1 from votos_cidades where produtor_id = p_produtor and ano = p_ano) then
    raise exception 'Produtor já votou' using errcode = 'unique_violation';
  end if;
  insert into votos_cidades (produtor_id, credenciamento_id, ano)
  select p_produtor, x, p_ano from unnest(p_ids) x;
end;
$function$;

create or replace view v_ranking_cidades as
select c.ano, c.id as credenciamento_id, m.nome as municipio, c.instituicao,
       count(v.produtor_id) as votos,
       rank() over (partition by c.ano order by count(v.produtor_id) desc) as posicao
from credenciamentos c
join municipios m on m.codigo = c.municipio_codigo
left join votos_cidades v on v.credenciamento_id = c.id
where c.apresentou
group by c.ano, c.id, m.nome, c.instituicao;
