-- Logos das exposições como foto do card "Progresso por Exposição".
-- Os arquivos ficam em public/exposicoes/<id>.png e a lista de ids em lib/fotos.ts.
set search_path to exposicao_cearense;

begin;

alter table exposicoes drop constraint if exists exposicoes_foto_check;
alter table exposicoes add constraint exposicoes_foto_check check (
  foto is null or foto = any (array[
    'boi-branco', 'ovelha', 'boi-vermelho', 'cavalo', 'milho',
    'expo-itapipoca', 'expo-brejo-santo', 'expo-morada-nova', 'expo-quixada',
    'expo-crateus', 'expo-crato', 'expo-expoece'
  ]::text[])
);

update exposicoes set foto = 'expo-itapipoca'   where nome = 'Exposição de Itapipoca';
update exposicoes set foto = 'expo-brejo-santo' where nome = 'Exposição de Brejo Santo';
update exposicoes set foto = 'expo-morada-nova' where nome = 'Exposição de Morada Nova';
update exposicoes set foto = 'expo-quixada'     where nome = 'Exposição de Quixadá';
update exposicoes set foto = 'expo-crateus'     where nome = 'Exposição de Crateús';
update exposicoes set foto = 'expo-crato'       where nome = 'Exposição do Crato (Expocrato)';
update exposicoes set foto = 'expo-expoece'     where nome = 'Expoece';

commit;
