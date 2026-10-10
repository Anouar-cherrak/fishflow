-- Améliorations de la base FishFlow (octobre 2026)
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Aucune donnée n'est supprimée ni modifiée. Peut être relancé sans risque.

-- 1. Index : accélèrent la recherche des données d'une personne (utile quand il y aura beaucoup d'inscrits)
create index if not exists fiches_user_id_idx on public.fiches (user_id);
create index if not exists fiches_folder_id_idx on public.fiches (folder_id);
create index if not exists folders_user_id_idx on public.folders (user_id);
create index if not exists exams_user_id_idx on public.exams (user_id);
create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists email_relances_user_id_idx on public.email_relances (user_id);
create index if not exists card_reviews_user_due_idx on public.card_reviews (user_id, due_at);
create index if not exists review_log_user_time_idx on public.review_log (user_id, reviewed_at);

-- 2. Règles d'accès : même protection, mais calculée une seule fois par requête (plus rapide)
alter policy "Users can view their own fiches" on public.fiches using ((select auth.uid()) = user_id);
alter policy "Users can insert their own fiches" on public.fiches with check ((select auth.uid()) = user_id);
alter policy "Users can delete their own fiches" on public.fiches using ((select auth.uid()) = user_id);
alter policy "Les utilisateurs peuvent modifier leurs propres fiches" on public.fiches using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can view their own profile" on public.profiles using ((select auth.uid()) = id);
alter policy "Les utilisateurs voient leurs propres dossiers" on public.folders using ((select auth.uid()) = user_id);
alter policy "Les utilisateurs créent leurs propres dossiers" on public.folders with check ((select auth.uid()) = user_id);
alter policy "Les utilisateurs modifient leurs propres dossiers" on public.folders using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Les utilisateurs suppriment leurs propres dossiers" on public.folders using ((select auth.uid()) = user_id);
alter policy "Voir ses révisions" on public.card_reviews using ((select auth.uid()) = user_id);
alter policy "Ajouter ses révisions" on public.card_reviews with check ((select auth.uid()) = user_id);
alter policy "Modifier ses révisions" on public.card_reviews using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Supprimer ses révisions" on public.card_reviews using ((select auth.uid()) = user_id);
alter policy exams_select_own on public.exams using (user_id = (select auth.uid()));
alter policy exams_insert_own on public.exams with check (user_id = (select auth.uid()));
alter policy exams_update_own on public.exams using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy exams_delete_own on public.exams using (user_id = (select auth.uid()));
alter policy review_log_select_own on public.review_log using ((select auth.uid()) = user_id);
alter policy review_log_insert_own on public.review_log with check ((select auth.uid()) = user_id);

-- 3. Fonctions internes (déclencheurs) : plus appelables depuis l'extérieur
revoke execute on function public.enforce_free_fiche_limit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = public;
