-- Presença dos expositores no dia do evento do ciclo (marcada na hora pelo organizador, pelo ID de 5 dígitos).
set search_path to exposicao_cearense;

create table if not exists presencas (
  ciclo_id uuid not null references ciclos (id) on delete cascade,
  produtor_id uuid not null references produtores (id) on delete cascade,
  marcado_em timestamptz not null default now(),
  primary key (ciclo_id, produtor_id)
);

create index if not exists presencas_ciclo_hora_idx on presencas (ciclo_id, marcado_em desc);

alter table presencas enable row level security;
