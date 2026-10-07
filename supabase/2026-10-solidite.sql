-- FishFlow — solidité, mesure et progression.
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Sûr à relancer plusieurs fois. Il ne supprime ni ne modifie aucune donnée existante.

-- 1) Quota atomique : deux demandes envoyées en même temps ne peuvent plus passer toutes les deux ----
create or replace function public.consume_usage(p_user text, p_key text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare c int;
begin
  perform pg_advisory_xact_lock(hashtext(p_user || ':' || p_key));
  select count into c from public.usage where user_id::text = p_user and month = p_key;
  if c is null then
    insert into public.usage (user_id, month, count) values (p_user::uuid, p_key, 1);
    return true;
  elsif c < p_limit then
    update public.usage set count = c + 1 where user_id::text = p_user and month = p_key;
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.refund_usage(p_user text, p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.usage set count = greatest(count - 1, 0) where user_id::text = p_user and month = p_key;
$$;

-- Seul le serveur de FishFlow peut les appeler (pas un visiteur depuis son navigateur).
revoke all on function public.consume_usage(text, text, int) from public, anon, authenticated;
revoke all on function public.refund_usage(text, text) from public, anon, authenticated;
grant execute on function public.consume_usage(text, text, int) to service_role;
grant execute on function public.refund_usage(text, text) to service_role;

-- 2) Limite de 5 fiches pour les comptes gratuits, vérifiée par la base (plus contournable) ---------
create or replace function public.enforce_free_fiche_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(new.user_id, auth.uid());
  is_pro_user boolean;
  n int;
begin
  if uid is null then
    return new;
  end if;
  select coalesce(is_pro, false) into is_pro_user from public.profiles where id = uid;
  if coalesce(is_pro_user, false) then
    return new;
  end if;
  select count(*) into n from public.fiches where user_id = uid;
  if n >= 5 then
    raise exception 'FREE_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists fiches_free_limit on public.fiches;
create trigger fiches_free_limit
  before insert on public.fiches
  for each row execute function public.enforce_free_fiche_limit();

-- 3) Journal des révisions (pour la progression : jours révisés, réussite, objectif du jour) -------
create table if not exists public.review_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  correct boolean not null
);
create index if not exists review_log_user_date on public.review_log (user_id, reviewed_at desc);

alter table public.review_log enable row level security;
drop policy if exists "review_log_select_own" on public.review_log;
drop policy if exists "review_log_insert_own" on public.review_log;
create policy "review_log_select_own" on public.review_log for select using (auth.uid() = user_id);
create policy "review_log_insert_own" on public.review_log for insert with check (auth.uid() = user_id);

-- 4) Mesure du parcours : aucun nom, aucun e-mail, aucune adresse IP --------------------------------
-- Juste : quel événement, de quelle origine (ex. tiktok), à quelle date.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  source text,
  user_id uuid references auth.users(id) on delete set null
);
create index if not exists events_name_date on public.events (name, created_at desc);

-- RLS activée sans aucune règle : personne ne peut lire ni écrire depuis le navigateur.
-- Seul le serveur (clé service) écrit, et toi tu lis dans le SQL Editor.
alter table public.events enable row level security;
