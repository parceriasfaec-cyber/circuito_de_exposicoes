-- Votação das cidades credenciadas: no dia das apresentações, cada produtor do Circuito escolhe 2 cidades.
-- Usa a mesma liberação/código do dia/telão da votação das exposições; a coluna votacao.modo diz qual está valendo.
set search_path to exposicao_cearense;

alter table votacao add column modo text not null default 'exposicoes'
  check (modo in ('exposicoes', 'cidades'));

-- Quantas cidades entram no Circuito (as mais votadas até esse número aparecem como classificadas)
alter table credenciamento_config add column vagas smallint check (vagas between 1 and 50);

create table votos_cidades (
  produtor_id uuid not null references produtores(id) on delete cascade,
  credenciamento_id uuid not null references credenciamentos(id) on delete cascade,
  ano smallint not null,
  votado_em timestamptz not null default now(),
  primary key (produtor_id, credenciamento_id)
);
create index votos_cidades_ano_produtor_ix on votos_cidades (ano, produtor_id);
alter table votos_cidades enable row level security;

-- Grava os 2 votos de uma vez; recusa se a votação das cidades não estiver aberta ou se o produtor já votou.
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
  if (select count(*) from credenciamentos where ano = p_ano and id = any(p_ids)) <> 2 then
    raise exception 'Cidade inválida';
  end if;
  -- um produtor por vez, para não votar duas vezes ao mesmo tempo
  perform pg_advisory_xact_lock(hashtext('votos_cidades|' || p_produtor::text));
  if exists (select 1 from votos_cidades where produtor_id = p_produtor and ano = p_ano) then
    raise exception 'Produtor já votou' using errcode = 'unique_violation';
  end if;
  insert into votos_cidades (produtor_id, credenciamento_id, ano)
  select p_produtor, x, p_ano from unnest(p_ids) x;
end;
$function$;

create view v_ranking_cidades as
select c.ano, c.id as credenciamento_id, m.nome as municipio, c.instituicao,
       count(v.produtor_id) as votos,
       rank() over (partition by c.ano order by count(v.produtor_id) desc) as posicao
from credenciamentos c
join municipios m on m.codigo = c.municipio_codigo
left join votos_cidades v on v.credenciamento_id = c.id
group by c.ano, c.id, m.nome, c.instituicao;
