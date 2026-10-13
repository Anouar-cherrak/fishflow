-- Limites d'usage FishFlow (octobre 2026)
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Aucune donnée existante n'est supprimée (sauf les vieux compteurs « rythme » d'une minute). Peut être relancé sans risque.
-- Sans ce script, le site marche quand même : seule la limite par adresse IP est inactive, et le coût est compté moins strictement.

-- 1. Limite de rythme (par compte et par adresse IP), par minute.
--    L'adresse IP n'est jamais stockée : seulement une empreinte, effacée au bout de 10 minutes.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
-- Aucune règle d'accès : seul le serveur (clé secrète) peut lire ou écrire cette table.

create or replace function public.consume_rate(p_key text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare c int;
begin
  -- Ménage : les compteurs de plus de 10 minutes ne servent plus.
  delete from public.rate_limits where created_at < now() - interval '10 minutes';
  insert into public.rate_limits (key, count) values (p_key, 1)
  on conflict (key) do update set count = public.rate_limits.count + 1
  returning count into c;
  return c <= p_limit;
end;
$$;

-- 2. Ajout atomique d'un montant à un compteur (coût OpenAI du mois, en dix-millièmes de dollar).
create or replace function public.add_usage(p_user text, p_key text, p_amount int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.usage (user_id, month, count) values (p_user::uuid, p_key, p_amount)
  on conflict (user_id, month) do update set count = public.usage.count + excluded.count;
$$;

-- Ces fonctions ne sont appelables que par le serveur.
revoke execute on function public.consume_rate(text, int) from public, anon, authenticated;
revoke execute on function public.add_usage(text, text, int) from public, anon, authenticated;

-- 3. Ménage : anciens compteurs « rythme » d'une minute (utilisés avant ce script).
delete from public.usage where month like 'rythme-%';
