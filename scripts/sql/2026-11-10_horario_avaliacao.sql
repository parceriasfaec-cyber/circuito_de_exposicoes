-- Horários da avaliação das exposições: o Painel mostra início e fim e pode programar abertura e fechamento automáticos.
alter table exposicao_cearense.votacao
  add column if not exists exposicoes_aberta_em timestamptz,      -- quando a avaliação começou (última abertura)
  add column if not exists cidades_aberta_em timestamptz,         -- quando a votação das cidades começou
  add column if not exists exposicoes_abrir_em timestamptz,       -- programado: abre sozinha neste horário
  add column if not exists exposicoes_fechar_em timestamptz;      -- programado: fecha sozinha neste horário

-- A última liberação (aberta_em) foi a da avaliação das exposições: a das cidades fechou antes dela.
update exposicao_cearense.votacao
set exposicoes_aberta_em = aberta_em
where id = 1 and exposicoes_aberta_em is null and aberta_em is not null
  and (cidades_fechada_em is null or aberta_em > cidades_fechada_em);

-- Aplica os horários programados. É chamada ao ler a votação (qualquer página) e antes de gravar uma avaliação,
-- então abrir e fechar acontecem no horário mesmo sem ninguém apertar botão.
create or replace function exposicao_cearense.aplicar_horarios()
returns void
language plpgsql
set search_path to 'exposicao_cearense', 'pg_temp'
as $$
begin
  -- Passou do horário de fechar: encerra (se estiver aberta) e limpa a programação.
  update votacao
  set exposicoes_fechada_em = case when exposicoes_aberta then exposicoes_fechar_em else exposicoes_fechada_em end,
      fechada_em = case when exposicoes_aberta then exposicoes_fechar_em else fechada_em end,
      aberta = case when exposicoes_aberta then cidades_aberta else aberta end,
      exposicoes_aberta = false,
      exposicoes_abrir_em = case when exposicoes_abrir_em <= exposicoes_fechar_em then null else exposicoes_abrir_em end,
      exposicoes_fechar_em = null
  where id = 1 and exposicoes_fechar_em is not null and now() >= exposicoes_fechar_em;

  -- Chegou o horário de abrir: libera (mesmo código do dia se já foi gerado hoje) e limpa o horário de abrir.
  update votacao
  set codigo_do_dia = case
        when codigo_do_dia ~ '^[0-9]{4}$'
         and (aberta_em at time zone 'America/Fortaleza')::date = (now() at time zone 'America/Fortaleza')::date
        then codigo_do_dia else lpad(floor(random() * 10000)::int::text, 4, '0') end,
      aberta_em = exposicoes_abrir_em,
      exposicoes_aberta_em = exposicoes_abrir_em,
      exposicoes_aberta = true,
      aberta = true,
      fechada_em = null,
      exposicoes_abrir_em = null
  where id = 1 and exposicoes_abrir_em is not null and now() >= exposicoes_abrir_em and not exposicoes_aberta;

  -- Horário de abrir que já passou com a avaliação aberta: só limpa.
  update votacao set exposicoes_abrir_em = null
  where id = 1 and exposicoes_abrir_em is not null and now() >= exposicoes_abrir_em and exposicoes_aberta;
end;
$$;

-- Antes de gravar, aplica os horários: depois do horário de fechar, a avaliação é recusada.
create or replace function exposicao_cearense.enviar_avaliacao(p_produtor uuid, p_exposicao uuid, p_notas smallint[])
returns void
language plpgsql
set search_path to 'exposicao_cearense', 'pg_temp'
as $function$
declare
  v_qtd int := (select count(*) from perguntas where exposicao_id = p_exposicao);
begin
  perform aplicar_horarios();
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
