-- Exposições do Circuito 2026 conforme o Calendário Oficial (nomes, datas e cidades).
-- As que já existiam mantêm produtores e avaliações; PEC Brasil e Expocrato são novas (as perguntas entram pelo gatilho).
-- Sobral, Iguatu e Limoeiro do Norte não estão no calendário: ficaram como estavam, aguardando decisão.
set search_path to exposicao_cearense;
do $$
declare c uuid := (select id from ciclos where ano = 2026);
begin
  update exposicoes set nome = 'Exposição de Crateús', data_inicio = '2026-06-01', data_fim = '2026-06-07'
   where ciclo_id = c and municipio = 'Crateús';
  update exposicoes set nome = 'Exposição de Morada Nova', data_inicio = '2026-07-29', data_fim = '2026-08-02'
   where ciclo_id = c and municipio = 'Morada Nova';
  update exposicoes set nome = 'Exposição de Quixadá', data_inicio = '2026-08-08', data_fim = '2026-08-16'
   where ciclo_id = c and municipio = 'Quixadá';
  update exposicoes set nome = 'Exposição de Itapipoca', data_inicio = '2026-08-23', data_fim = '2026-08-30'
   where ciclo_id = c and municipio = 'Itapipoca';
  update exposicoes set nome = 'Exposição de Brejo Santo', data_inicio = '2026-08-25', data_fim = '2026-08-29'
   where ciclo_id = c and municipio = 'Brejo Santo';
  update exposicoes set nome = 'Expoece', data_inicio = '2026-11-01', data_fim = '2026-11-08'
   where ciclo_id = c and nome = 'Exposição Agropecuária de Fortaleza';
  update exposicoes set nome = 'Exposição de Tauá', data_inicio = '2026-11-15', data_fim = '2026-11-22'
   where ciclo_id = c and municipio = 'Tauá';
  insert into exposicoes (ciclo_id, nome, municipio, data_inicio, data_fim)
  select c, 'PEC Brasil', 'Fortaleza', '2026-06-25', '2026-06-28'
   where not exists (select 1 from exposicoes where ciclo_id = c and nome = 'PEC Brasil');
  insert into exposicoes (ciclo_id, nome, municipio, data_inicio, data_fim)
  select c, 'Exposição do Crato (Expocrato)', 'Crato', '2026-07-12', '2026-07-19'
   where not exists (select 1 from exposicoes where ciclo_id = c and nome = 'Exposição do Crato (Expocrato)');
end $$;
