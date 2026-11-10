-- Avaliação das exposições e votação das cidades abrem e fecham separadas (podem ficar abertas juntas).
-- O código do dia é o mesmo para as duas. "aberta" continua = alguma das duas aberta.
set search_path to exposicao_cearense;

alter table votacao
  add column if not exists exposicoes_aberta boolean not null default false,
  add column if not exists cidades_aberta boolean not null default false,
  add column if not exists exposicoes_fechada_em timestamptz,
  add column if not exists cidades_fechada_em timestamptz;

update votacao set
  exposicoes_aberta = aberta and modo = 'exposicoes',
  cidades_aberta = aberta and modo = 'cidades',
  exposicoes_fechada_em = coalesce(exposicoes_fechada_em, fechada_em),
  cidades_fechada_em = coalesce(cidades_fechada_em, fechada_em)
where id = 1;

create or replace function enviar_avaliacao(p_produtor uuid, p_exposicao uuid, p_notas smallint[])
returns void language plpgsql set search_path to 'exposicao_cearense', 'pg_temp' as $function$
declare
  v_qtd int := (select count(*) from perguntas where exposicao_id = p_exposicao);
begin
  if not coalesce((select exposicoes_aberta from votacao where id = 1), false) then
    raise exception 'A votação está fechada';
  end if;
  if array_length(p_notas, 1) is distinct from v_qtd then
    raise exception 'São necessárias % notas', v_qtd;
  end if;
  insert into avaliacoes (produtor_id, exposicao_id, media)
  values (p_produtor, p_exposicao, (select round(avg(n), 2) from unnest(p_notas) as n));
  insert into respostas (produtor_id, exposicao_id, pergunta_id, nota)
  select p_produtor, p_exposicao, q.id, p_notas[q.ordem]
  from perguntas q where q.exposicao_id = p_exposicao;
end;
$function$;

create or replace function votar_cidades(p_produtor uuid, p_ano smallint, p_ids uuid[])
returns void language plpgsql set search_path to 'exposicao_cearense', 'pg_temp' as $function$
begin
  if not coalesce((select cidades_aberta from votacao where id = 1), false) then
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
