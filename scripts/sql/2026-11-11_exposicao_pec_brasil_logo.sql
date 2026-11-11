-- Logo da PEC Brasil (public/exposicoes/expo-pec-brasil.png). Rodar depois que o site com a imagem estiver publicado.
set search_path to exposicao_cearense;

begin;

alter table exposicoes drop constraint if exists exposicoes_foto_check;
alter table exposicoes add constraint exposicoes_foto_check check (
  foto is null or foto = any (array[
    'boi-branco', 'ovelha', 'boi-vermelho', 'cavalo', 'milho',
    'expo-itapipoca', 'expo-brejo-santo', 'expo-morada-nova', 'expo-quixada',
    'expo-crateus', 'expo-crato', 'expo-expoece', 'expo-taua', 'expo-pec-brasil'
  ]::text[])
);

update exposicoes set foto = 'expo-pec-brasil' where nome = 'PEC Brasil (Pec Brasil)';

commit;
