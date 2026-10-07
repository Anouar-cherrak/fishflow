-- FishFlow — ton tableau de bord, à lancer dans Supabase > SQL Editor (LECTURE SEULE).
-- Lance chaque requête séparément (sélectionne-la puis Run).

-- 1) Le parcours des 30 derniers jours, par origine du lien (ex. tiktok, instagram, direct)
select coalesce(source, 'direct') as origine,
       count(*) filter (where name = 'visit')        as visites,
       count(*) filter (where name = 'signup')       as inscriptions,
       count(*) filter (where name = 'first_fiche')  as premieres_fiches,
       count(*) filter (where name = 'pricing_view') as vues_page_prix
from public.events
where created_at > now() - interval '30 days'
group by 1
order by visites desc;

-- 2) Combien de personnes sont revenues (au moins 2 jours différents où elles ont créé une fiche ou révisé)
select count(*) as personnes_revenues
from (
  select user_id from (
    select user_id, created_at::date as jour from public.fiches
    union
    select user_id, reviewed_at::date as jour from public.review_log
  ) t
  group by user_id
  having count(distinct jour) >= 2
) r;

-- 3) Comptes Pro
select count(*) filter (where is_pro) as comptes_pro, count(*) as comptes_total from public.profiles;
