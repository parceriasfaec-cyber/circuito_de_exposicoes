-- 10 perguntas (documento "Avaliação das etapas do Circuito"), notas de 1 a 5
-- e pontuação pela MÉDIA das notas, não mais pela soma.
-- Aplicada em 2026-11-09 no Supabase (projeto Parcerias). Apaga as avaliações de teste.
set search_path to exposicao_cearense;

-- Respostas de teste (5 perguntas, notas de 5 a 10) não combinam com o novo questionário.
delete from respostas;
delete from avaliacoes;

-- Perguntas: de 5 para 10
alter table perguntas drop constraint perguntas_ordem_check;
alter table perguntas add constraint perguntas_ordem_check check (ordem between 1 and 10);
alter table perguntas_padrao drop constraint perguntas_padrao_ordem_check;
alter table perguntas_padrao add constraint perguntas_padrao_ordem_check check (ordem between 1 and 10);

delete from perguntas_padrao;
insert into perguntas_padrao (ordem, texto) values
 (1, 'Recepção e acolhimento dos expositores: Como você avalia a recepção, o credenciamento, as orientações e o acompanhamento oferecidos pela organização na chegada ao evento?'),
 (2, 'Infraestrutura e acomodação dos animais: Os currais, baias, bretes, sombreamento, ventilação, espaço e instalações disponibilizados foram adequados para receber os animais?'),
 (3, 'Bem-estar e segurança dos animais: O evento ofereceu condições adequadas de conforto, higiene, segurança, manejo e proteção dos animais durante toda a exposição?'),
 (4, 'Alimentação e fornecimento de água para os animais: A quantidade, a qualidade e a disponibilidade de alimentos e água atenderam às necessidades dos animais durante o período do evento?'),
 (5, 'Apoio e condições oferecidas aos tratadores: Foram disponibilizados espaços adequados para descanso, higiene, banheiros, alojamento e demais necessidades dos tratadores?'),
 (6, 'Alimentação dos tratadores e expositores: A organização ofereceu alimentação adequada, em quantidade suficiente, com qualidade e horários compatíveis com a rotina da exposição?'),
 (7, 'Organização dos julgamentos e atividades técnicas: Os julgamentos, a programação, os horários, os critérios de avaliação e a condução das atividades ocorreram de maneira organizada e transparente?'),
 (8, 'Premiação e pagamento dos prêmios: A premiação foi atrativa, compatível com a importância do evento e paga dentro dos prazos estabelecidos pela organização?'),
 (9, 'Atendimento e suporte durante o evento: A promotora do evento esteve disponível e resolveu satisfatoriamente as demandas dos expositores durante a exposição?'),
 (10, 'Satisfação geral e retorno do expositor: Considerando os serviços, a estrutura, os custos e os benefícios oferecidos, você considera satisfatória sua participação e pretende retornar na próxima edição?');

-- Todas as exposições passam a ter as 10 perguntas novas
delete from perguntas;
insert into perguntas (exposicao_id, ordem, texto)
select e.id, p.ordem, p.texto from exposicoes e cross join perguntas_padrao p;

-- Notas de 1 (muito ruim) a 5 (excelente)
alter table respostas drop constraint respostas_nota_check;
alter table respostas add constraint respostas_nota_check check (nota between 1 and 5);

-- Avaliação guarda a média das 10 notas (ex.: 4,30) em vez da soma
drop view v_ranking;
alter table avaliacoes drop column nota_total;
alter table avaliacoes add column media numeric(3,2) not null check (media between 1 and 5);

create view v_ranking as
select e.ciclo_id,
       e.id as exposicao_id,
       e.nome,
       count(a.produtor_id) as questionarios,
       round(avg(a.media), 2) as media,
       rank() over (partition by e.ciclo_id order by avg(a.media) desc nulls last) as posicao
from exposicoes e
left join avaliacoes a on a.exposicao_id = e.id
group by e.ciclo_id, e.id, e.nome;

create or replace function enviar_avaliacao(p_produtor uuid, p_exposicao uuid, p_notas smallint[])
returns void
language plpgsql
set search_path to 'exposicao_cearense', 'pg_temp'
as $function$
declare
  v_qtd int := (select count(*) from perguntas where exposicao_id = p_exposicao);
begin
  if not coalesce((select aberta from votacao where id = 1), false) then
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

-- Desempate (aplicado em seguida, 2026-11-09):
-- 1º maior média na pergunta 10 (satisfação geral); 2º mais questionários respondidos.
drop view v_ranking;
create view v_ranking as
with base as (
  select e.ciclo_id, e.id as exposicao_id, e.nome,
         count(a.produtor_id) as questionarios,
         avg(a.media) as media_exata,
         (select avg(r.nota) from respostas r join perguntas q on q.id = r.pergunta_id
           where q.exposicao_id = e.id and q.ordem = 10) as media_p10_exata
  from exposicoes e
  left join avaliacoes a on a.exposicao_id = e.id
  group by e.ciclo_id, e.id, e.nome
)
select ciclo_id, exposicao_id, nome, questionarios,
       round(media_exata, 2) as media,
       round(media_p10_exata, 2) as media_satisfacao,
       rank() over (partition by ciclo_id order by media_exata desc nulls last,
                    media_p10_exata desc nulls last, questionarios desc) as posicao
from base;

-- Ajuste (2026-11-09): novo texto da pergunta 9 e desempate pelas perguntas 2, 5 e 9, nessa ordem
-- (substitui o desempate anterior pela pergunta 10 + questionários).
update perguntas set texto = 'Atendimento e suporte durante o evento: A promotora do evento esteve disponível e resolveu satisfatoriamente as demandas dos expositores durante a exposição?' where ordem = 9;
drop view v_ranking;
create view v_ranking as
with notas as (
  select q.exposicao_id,
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
                    n.p2 desc nulls last, n.p5 desc nulls last, n.p9 desc nulls last) as posicao
from base b left join notas n on n.exposicao_id = b.exposicao_id;
