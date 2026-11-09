-- Responsável/gestor de cada exposição (Calendário Oficial 2026).
set search_path to exposicao_cearense;
alter table exposicoes add column if not exists responsavel text;
do $$
declare c uuid := (select id from ciclos where ano = 2026);
begin
  update exposicoes set responsavel = 'Dr. Darlan' where ciclo_id = c and nome = 'Exposição de Crateús';
  update exposicoes set responsavel = 'Dr. Eduardo' where ciclo_id = c and nome = 'PEC Brasil';
  update exposicoes set responsavel = 'Dr. Leitão / Dr. Pedro' where ciclo_id = c and nome = 'Exposição do Crato (Expocrato)';
  update exposicoes set responsavel = 'Dr. Eduardo Júnior' where ciclo_id = c and nome = 'Exposição de Morada Nova';
  update exposicoes set responsavel = 'Dr. Marcelo' where ciclo_id = c and nome = 'Exposição de Quixadá';
  update exposicoes set responsavel = 'Dr. Juquinha' where ciclo_id = c and nome = 'Exposição de Itapipoca';
  update exposicoes set responsavel = 'Dr. Edjanio' where ciclo_id = c and nome = 'Exposição de Brejo Santo';
  update exposicoes set responsavel = 'Dr. Braga' where ciclo_id = c and nome = 'Expoece';
  update exposicoes set responsavel = 'Dr. Paulo Júnior' where ciclo_id = c and nome = 'Exposição de Tauá';
end $$;
