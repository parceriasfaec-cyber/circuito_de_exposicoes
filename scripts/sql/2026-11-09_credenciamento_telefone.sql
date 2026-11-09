-- Telefone/WhatsApp de contato do responsável (só números, com DDD). Cadastros antigos ficam sem.
set search_path to exposicao_cearense;
alter table credenciamentos add column telefone text check (telefone is null or telefone ~ '^[0-9]{10,11}$');
