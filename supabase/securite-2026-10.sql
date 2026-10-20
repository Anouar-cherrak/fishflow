-- Sécurité FishFlow (octobre 2026)
-- À coller dans Supabase → SQL Editor → New query → Run (ou appliqué par Claude).
-- Aucune donnée existante n'est supprimée ni modifiée. Peut être relancé sans risque.

-- 1. Fichiers stockés : le dossier « cours-uploads » était ouvert à tous les comptes connectés
--    (lire, modifier, supprimer les fichiers des AUTRES). On ne garde que « chacun son propre dossier ».
drop policy if exists "Acces complet utilisateurs connectes fgqs7j_0" on storage.objects;
drop policy if exists "Acces complet utilisateurs connectes fgqs7j_1" on storage.objects;
drop policy if exists "Acces complet utilisateurs connectes fgqs7j_2" on storage.objects;
drop policy if exists "Acces complet utilisateurs connectes fgqs7j_3" on storage.objects;
drop policy if exists "Lire ses propres fichiers" on storage.objects;
create policy "Lire ses propres fichiers" on storage.objects for select to authenticated
  using (bucket_id = 'cours-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Supprimer ses propres fichiers" on storage.objects;
create policy "Supprimer ses propres fichiers" on storage.objects for delete to authenticated
  using (bucket_id = 'cours-uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. Révisions : la fiche visée doit appartenir à la personne (avant : seule la ligne de révision était vérifiée).
alter policy "Ajouter ses révisions" on public.card_reviews
  with check ((select auth.uid()) = user_id and exists (select 1 from public.fiches f where f.id = fiche_id and f.user_id = (select auth.uid())));
alter policy "Modifier ses révisions" on public.card_reviews
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.fiches f where f.id = fiche_id and f.user_id = (select auth.uid())));

-- Une fiche ne peut être rangée que dans un de SES dossiers.
alter policy "Users can insert their own fiches" on public.fiches
  with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.folders d where d.id = folder_id and d.user_id = (select auth.uid()))));
alter policy "Les utilisateurs peuvent modifier leurs propres fiches" on public.fiches
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.folders d where d.id = folder_id and d.user_id = (select auth.uid()))));

-- 3. Tailles maximales (contre le remplissage de la base par un script). « not valid » : les données déjà là ne sont pas revérifiées.
alter table public.fiches drop constraint if exists fiches_taille_max;
alter table public.fiches add constraint fiches_taille_max
  check (octet_length(data::text) <= 500000 and length(coalesce(title, '')) <= 200) not valid;
alter table public.folders drop constraint if exists folders_taille_max;
alter table public.folders add constraint folders_taille_max
  check (length(coalesce(name, '')) <= 100 and length(coalesce(color, '')) <= 40) not valid;
alter table public.exams drop constraint if exists exams_taille_max;
alter table public.exams add constraint exams_taille_max
  check (length(coalesce(title, '')) <= 120 and coalesce(cardinality(fiche_ids), 0) <= 300) not valid;

-- Au plus 40 fiches enregistrées par 24 heures et par compte (Pro : 10 créations par jour ; le reste = copies de fiches partagées).
create or replace function public.enforce_fiche_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  select count(*) into n from public.fiches where user_id = new.user_id and created_at > now() - interval '24 hours';
  if n >= 40 then
    raise exception 'DAILY_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_fiche_daily_cap() from public, anon, authenticated;
drop trigger if exists fiches_daily_cap on public.fiches;
create trigger fiches_daily_cap before insert on public.fiches for each row execute function public.enforce_fiche_daily_cap();

-- 4. « Vider une table » (TRUNCATE) passe outre les règles d'accès : retiré aux rôles publics par précaution.
revoke truncate on all tables in schema public from anon, authenticated;
-- Tables internes : aucun accès direct depuis le navigateur (seul le serveur, avec la clé secrète, s'en sert).
revoke all on public.usage, public.rate_limits, public.email_relances, public.events from anon, authenticated;

-- 5. Limites de requêtes du serveur (fenêtre de temps réglable). Renvoie 0 si c'est autorisé, sinon le nombre de secondes à attendre.
create table if not exists public.rate_windows (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  window_seconds integer not null
);
alter table public.rate_windows enable row level security;
revoke all on public.rate_windows from anon, authenticated;

create or replace function public.rate_window_hit(p_key text, p_limit int, p_window_seconds int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if random() < 0.02 then
    delete from public.rate_windows where window_start + make_interval(secs => window_seconds) < now() - interval '1 minute';
  end if;
  insert into public.rate_windows as w (key, count, window_start, window_seconds)
  values (p_key, 1, now(), p_window_seconds)
  on conflict (key) do update set
    count = case when w.window_start + make_interval(secs => w.window_seconds) <= now() then 1 else w.count + 1 end,
    window_start = case when w.window_start + make_interval(secs => w.window_seconds) <= now() then now() else w.window_start end,
    window_seconds = excluded.window_seconds
  returning w.count, w.window_start, w.window_seconds into r;
  if r.count <= p_limit then return 0; end if;
  return greatest(1, ceil(extract(epoch from (r.window_start + make_interval(secs => r.window_seconds) - now())))::int);
end;
$$;
revoke execute on function public.rate_window_hit(text, int, int) from public, anon, authenticated;

-- 6. Blocage progressif après des erreurs (connexion, code, etc.) : 1 min, puis 5 min, puis 15 min.
--    Les erreurs sont oubliées après 1 heure sans nouvelle erreur. Clés = empreintes (jamais l'email ni l'IP en clair).
create table if not exists public.auth_failures (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_failure timestamptz not null default now()
);
alter table public.auth_failures enable row level security;
revoke all on public.auth_failures from anon, authenticated;

create or replace function public.auth_lock_seconds(p_key text)
returns int
language sql
security definer
set search_path = public
as $$
  select coalesce((select greatest(0, ceil(extract(epoch from (locked_until - now()))))::int
                   from public.auth_failures where key = p_key and locked_until > now()), 0);
$$;

create or replace function public.auth_register_failure(p_key text, p_threshold int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare f int; lock_s int;
begin
  if random() < 0.02 then
    delete from public.auth_failures where last_failure < now() - interval '1 day';
  end if;
  insert into public.auth_failures as a (key, failures, last_failure) values (p_key, 1, now())
  on conflict (key) do update set
    failures = case when a.last_failure < now() - interval '1 hour' then 1 else a.failures + 1 end,
    last_failure = now()
  returning a.failures into f;
  lock_s := case
    when f < p_threshold then 0
    when f = p_threshold then 60
    when f = p_threshold + 1 then 300
    else 900
  end;
  if lock_s > 0 then
    update public.auth_failures set locked_until = now() + make_interval(secs => lock_s) where key = p_key;
  end if;
  return lock_s;
end;
$$;

create or replace function public.auth_clear_failures(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_failures where key = p_key;
$$;

revoke execute on function public.auth_lock_seconds(text) from public, anon, authenticated;
revoke execute on function public.auth_register_failure(text, int) from public, anon, authenticated;
revoke execute on function public.auth_clear_failures(text) from public, anon, authenticated;

-- 7. Stripe : chaque événement n'est traité qu'une fois (un événement rejoué est ignoré).
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
