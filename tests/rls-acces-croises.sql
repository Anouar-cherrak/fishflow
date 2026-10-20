-- Preuve : un compte ne peut ni lire, ni modifier, ni supprimer les données des autres.
-- À coller dans Supabase → SQL Editor → Run. Tout se passe dans une transaction ANNULÉE à la fin : rien n'est modifié.
-- Résultat attendu : toutes les lignes « ok = true ».
begin;

create temp table resultats (test text, ok boolean) on commit drop;
grant all on resultats to authenticated;

-- On se fait passer pour un compte pirate (identifiant inventé) connecté via l'API publique.
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}', true);
set local role authenticated;

insert into resultats select 'lire les fiches des autres', (select count(*) from public.fiches) = 0;
insert into resultats select 'lire les profils des autres (statut Pro, client Stripe)', (select count(*) from public.profiles) = 0;
insert into resultats select 'lire les dossiers des autres', (select count(*) from public.folders) = 0;
insert into resultats select 'lire les examens des autres', (select count(*) from public.exams) = 0;
insert into resultats select 'lire les révisions des autres', (select count(*) from public.card_reviews) = 0;
insert into resultats select 'lire le journal des révisions des autres', (select count(*) from public.review_log) = 0;

-- Modifier ou supprimer chez les autres : 0 ligne touchée.
with t as (update public.fiches set title = 'piraté' returning 1) insert into resultats select 'modifier les fiches des autres', (select count(*) from t) = 0;
with t as (delete from public.fiches returning 1) insert into resultats select 'supprimer les fiches des autres', (select count(*) from t) = 0;
with t as (delete from public.folders returning 1) insert into resultats select 'supprimer les dossiers des autres', (select count(*) from t) = 0;
with t as (update public.exams set title = 'piraté' returning 1) insert into resultats select 'modifier les examens des autres', (select count(*) from t) = 0;

-- Se donner Pro : refusé (aucune règle ne permet de modifier son profil depuis le navigateur).
with t as (update public.profiles set is_pro = true returning 1) insert into resultats select 'se donner Pro', (select count(*) from t) = 0;

-- Créer une fiche au nom de quelqu'un d'autre : refusé.
do $$ begin
  begin
    insert into public.fiches (user_id, title, data) values ('00000000-0000-0000-0000-000000000001', 'x', '{}');
    insert into resultats values ('créer une fiche au nom d''un autre', false);
  exception when others then
    insert into resultats values ('créer une fiche au nom d''un autre', true);
  end;
end $$;

-- Tables internes (compteurs d'usage, limites, Stripe) : aucun accès.
do $$
declare t text; n bigint;
begin
  foreach t in array array['usage', 'rate_limits', 'email_relances', 'events', 'rate_windows', 'auth_failures', 'stripe_events'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      insert into resultats values ('lire la table interne ' || t, n = 0);
    exception when insufficient_privilege or undefined_table then
      insert into resultats values ('lire la table interne ' || t, true);
    end;
  end loop;
end $$;

-- Fonctions internes (compteurs) : pas appelables depuis le navigateur.
do $$ begin
  begin
    perform public.consume_usage('99999999-9999-9999-9999-999999999999', 'x', 1);
    insert into resultats values ('appeler consume_usage', false);
  exception when insufficient_privilege then
    insert into resultats values ('appeler consume_usage', true);
  end;
end $$;

select test, ok from resultats;
rollback;
