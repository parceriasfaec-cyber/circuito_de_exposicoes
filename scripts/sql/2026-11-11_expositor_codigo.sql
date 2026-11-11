-- ID do expositor: 5 dígitos (10000 a 99999), aleatório e sem repetir. Usado na presença do dia do evento.
-- Quem já existe ganha um agora; quem for cadastrado depois ganha sozinho (default da coluna).
set search_path to exposicao_cearense;

begin;

create or replace function exposicao_cearense.novo_codigo_expositor() returns text
language plpgsql volatile as $$
declare c text;
begin
  loop
    c := (10000 + floor(random() * 90000))::int::text;
    exit when not exists (select 1 from exposicao_cearense.produtores where codigo = c);
  end loop;
  return c;
end $$;

alter table produtores add column if not exists codigo text;
-- Um por vez: num update único, os códigos sorteados na mesma instrução não se enxergam e poderiam repetir.
do $$
declare r record;
begin
  for r in select id from exposicao_cearense.produtores where codigo is null order by random() loop
    update exposicao_cearense.produtores set codigo = exposicao_cearense.novo_codigo_expositor() where id = r.id;
  end loop;
end $$;
alter table produtores alter column codigo set default exposicao_cearense.novo_codigo_expositor();
alter table produtores alter column codigo set not null;
alter table produtores add constraint produtores_codigo_formato check (codigo ~ '^[1-9][0-9]{4}$');
alter table produtores add constraint produtores_codigo_uk unique (codigo);

commit;
