-- Sécurité, 25/10/2026 (branche securite-complete). À coller par Anouar dans Supabase → SQL Editor.
-- Partie 1 : VÉRIFICATIONS (lecture seule, sans risque). Partie 2 : CORRECTIONS (à lancer après avoir lu les résultats).

-- ============ Partie 1 : vérifications ============

-- 1a. Les fonctions de sécurité sont-elles installées ? Il doit y avoir 6 lignes.
--     S'il en manque, les limites (connexion, e-mails, générations) sont COUPÉES : coller securite-2026-10.sql et limites-2026-10.sql.
select proname from pg_proc
where proname in ('rate_window_hit', 'auth_register_failure', 'consume_usage', 'consume_rate', 'add_usage', 'get_shared_fiche');

-- 1b. RLS activée partout (la colonne relrowsecurity doit valoir true pour chaque table).
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;

-- 1c. Règles d'accès. Sur « profiles », il ne doit y avoir AUCUNE règle UPDATE ni INSERT
--     (sinon quelqu'un pourrait se donner Pro lui-même).
select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, cmd;

-- 1d. La fonction de partage : vérifier qu'elle ne renvoie pas le cours d'origine (sourceText).
select pg_get_functiondef('public.get_shared_fiche'::regproc);

-- ============ Partie 2 : corrections ============

-- 2a. Un lien de partage = une seule fiche (empêche de « voler » le lien d'une autre fiche).
--     Si cette ligne échoue avec « duplicate key », me le dire avant d'aller plus loin.
create unique index if not exists fiches_share_id_unique on public.fiches (share_id) where share_id is not null;

-- 2b. get_shared_fiche : dans le résultat de 1d, remplacer la colonne « data » renvoyée par « data - 'sourceText' »,
--     puis relancer le « create or replace function » ainsi modifié. (Le site retire déjà sourceText de la page,
--     mais la fonction peut être appelée directement avec la clé publique.)
