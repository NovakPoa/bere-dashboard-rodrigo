-- Schema Terra API para receber dados do Garmin
create table terra_users (
  user_id varchar(36) primary key,
  reference_id text default null,
  created_at text not null,
  granted_scopes text default null,
  provider text not null,
  state varchar(20)
);

create table terra_data_payloads (
  user_id varchar(36) not null,
  data_type text not null,
  created_at text not null,
  payload_id text not null,
  start_time text default null,
  end_time text default null,
  constraint terra_data_payloads_pkey primary key (user_id, created_at)
);

create table terra_misc_payloads (
  user_id varchar(36) not null,
  data_type text default null,
  payload_type text default null,
  created_at text not null,
  payload_id text not null,
  constraint terra_misc_payloads_pkey primary key (user_id, created_at)
);

-- Desabilitar RLS para permitir que a Terra API escreva diretamente
ALTER TABLE terra_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE terra_data_payloads DISABLE ROW LEVEL SECURITY;
ALTER TABLE terra_misc_payloads DISABLE ROW LEVEL SECURITY;