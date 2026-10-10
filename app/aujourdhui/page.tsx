"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/AppShell";
import { questionOfTheDay } from "@/lib/curiosity";
import {
  countDueCards,
  getDailyCounts,
  getHardCards,
  getProgress,
  type DayCount,
  type HardCard,
  type Progress,
} from "@/lib/reviews";

type RecentFiche = { id: string; title: string };

const GOALS = [5, 10, 20, 30];
const GOAL_KEY = "ff-goal";

function DaysChart({ counts, label }: { counts: DayCount[]; label: string }) {
  const max = Math.max(1, ...counts.map((c) => c.total));
  return (
    <div role="img" aria-label={label} className="flex items-end gap-1 h-28">
      {counts.map((c, i) => {
        const isToday = i === counts.length - 1;
        return (
          <div key={i} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
            <div
              className={`w-full rounded-t-md ${isToday ? "bg-[#22C55E]" : "bg-black/25"}`}
              style={{ height: `${Math.max(c.total > 0 ? 6 : 2, (c.total / max) * 100)}%`, opacity: c.total === 0 ? 0.35 : 1 }}
              title={`${c.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${c.total} carte${c.total > 1 ? "s" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Aujourdhui() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [due, setDue] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [counts, setCounts] = useState<DayCount[]>([]);
  const [logOk, setLogOk] = useState(true);
  const [hard, setHard] = useState<HardCard[]>([]);
  const [recent, setRecent] = useState<RecentFiche[]>([]);
  const [ficheTotal, setFicheTotal] = useState(0);
  const [goal, setGoal] = useState(10);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(GOAL_KEY));
      if (GOALS.includes(saved)) setGoal(saved);
    } catch {}

    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const usage = await fetch("/api/usage").then((r) => r.json()).catch(() => ({ isPro: false }));
      const pro = !!usage.isPro;

      const [dueNow, prog, daily, fiches, hardCards] = await Promise.all([
        countDueCards(),
        getProgress(),
        getDailyCounts(pro ? 30 : 7),
        supabase.from("fiches").select("id, title", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
        pro ? getHardCards(6) : Promise.resolve([] as HardCard[]),
      ]);
      if (cancelled) return;

      setIsPro(pro);
      setDue(dueNow);
      setProgress(prog);
      setCounts(daily.counts);
      setLogOk(daily.ok);
      setHard(hardCards);
      setRecent((fiches.data ?? []) as RecentFiche[]);
      setFicheTotal(fiches.count ?? (fiches.data ?? []).length);
      setReady(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const chooseGoal = (n: number) => {
    setGoal(n);
    try {
      localStorage.setItem(GOAL_KEY, String(n));
    } catch {}
  };

  if (!ready) {
    return (
      <AppShell size="wide">
        <p className="text-black/50 text-sm py-24 text-center" role="status">Chargement...</p>
      </AppShell>
    );
  }

  const today = counts[counts.length - 1];
  // Secours : si le journal des révisions est vide ou absent, on compte les cartes révisées aujourd'hui.
  const doneToday = Math.max(today?.total ?? 0, progress?.reviewedToday ?? 0);
  const ratio = Math.min(1, doneToday / goal);
  const reached = doneToday >= goal;
  const question = questionOfTheDay(offset);

  const totalReviews = counts.reduce((a, c) => a + c.total, 0);
  const totalCorrect = counts.reduce((a, c) => a + c.correct, 0);
  const successRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : null;

  const R = 52;
  const C = 2 * Math.PI * R;

  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppShell size="wide">
      <div className="mb-6 sm:mb-8 ff-fade-up">
        <h1 className="ff-title mb-2">Aujourd&apos;hui.</h1>
        <p className="ff-lead first-letter:uppercase">{todayLabel}</p>
      </div>

      {ficheTotal === 0 && (
        <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8 mb-6 ff-fade-up">
          <h2 className="text-xl font-bold tracking-tight mb-2">Commence ici.</h2>
          <p className="text-black/65 mb-5 max-w-[60ch]">
            Colle un cours, un article ou une photo de tes notes : tu obtiens une fiche, des flashcards et un quiz. Ou pose
            simplement une question que tu te poses.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/generer" className="ff-primary ff-btn">Créer ma première fiche</Link>
            <Link href="/apprendre" className="ff-secondary">Poser une question</Link>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:gap-8 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
        <div className="grid gap-6 min-w-0">
          <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="goal-title">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative shrink-0 w-[92px] h-[92px] sm:w-[120px] sm:h-[120px]">
                <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - ratio)}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset .6s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-xl sm:text-2xl font-extrabold leading-none tabular-nums">{doneToday}</p>
                    <p className="text-xs text-black/55 mt-1">sur {goal}</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <h2 id="goal-title" className="text-lg sm:text-xl font-bold tracking-tight mb-1">
                  {reached ? "Objectif atteint." : "Ton objectif du jour"}
                </h2>
                <p className="text-black/65 text-sm">
                  {reached
                    ? "Bravo. Tout ce que tu révises en plus, c'est du bonus."
                    : `${goal - doneToday} carte${goal - doneToday > 1 ? "s" : ""} à réviser pour y arriver.`}
                </p>
              </div>
            </div>

            <p className="mt-5 mb-2 text-xs text-black/55">Cartes à réviser par jour</p>
            <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center" role="group" aria-label="Choisir ton objectif quotidien">
              {GOALS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => chooseGoal(n)}
                  aria-pressed={goal === n}
                  aria-label={`${n} cartes par jour`}
                  className={`min-h-[44px] sm:px-4 rounded-full border text-sm font-semibold transition ${
                    goal === n ? "bg-black text-white border-black" : "border-black/15 text-black/65 hover:border-black/40"
                  }`}
                >
                  {n}<span className="hidden sm:inline">&nbsp;cartes</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {due > 0 ? (
                <Link href="/reviser" className="ff-primary ff-btn w-full sm:w-auto">
                  Réviser {Math.min(due, 20)} carte{Math.min(due, 20) > 1 ? "s" : ""} maintenant
                </Link>
              ) : ficheTotal > 0 && !reached ? (
                <Link href="/reviser" className="ff-primary ff-btn w-full sm:w-auto">
                  Découvrir de nouvelles cartes
                </Link>
              ) : (
                <p className="text-sm text-black/60">
                  Rien à revoir pour le moment : tes prochaines cartes reviendront au bon moment.{" "}
                  <Link href="/generer" className="underline text-black">Créer une fiche</Link>
                </p>
              )}
            </div>
          </section>

          <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="curio-title">
            <h2 id="curio-title" className="text-xl font-bold tracking-tight mb-3">Une question pour aujourd&apos;hui</h2>
            <p className="text-lg text-black/85 mb-5 max-w-[48ch]">{question}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/apprendre?q=${encodeURIComponent(question)}`} className="ff-primary ff-btn w-full sm:w-auto">
                Poser cette question
              </Link>
              <button type="button" onClick={() => setOffset((o) => o + 1)} className="ff-secondary w-full sm:w-auto">
                Une autre
              </button>
            </div>
          </section>

          {recent.length > 0 && (
            <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="recent-title">
              <h2 id="recent-title" className="text-xl font-bold tracking-tight mb-3">Reprendre</h2>
              <ul className="grid gap-1">
                {recent.map((f) => (
                  <li key={f.id}>
                    <Link href={`/fiche/${f.id}`} className="flex items-center justify-between gap-3 min-h-[48px] py-2 border-b border-black/10 last:border-0 hover:text-[#22C55E] transition">
                      <span className="font-medium truncate">{f.title}</span>
                      <span aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/mes-fiches" className="inline-block mt-3 text-sm underline text-black/65 min-h-[44px] leading-[44px]">
                Toutes mes fiches
              </Link>
            </section>
          )}
        </div>

        <div className="grid gap-6 min-w-0">
          <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="prog-title">
            <h2 id="prog-title" className="text-xl font-bold tracking-tight mb-4">Ta progression</h2>
            <dl className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <dt className="text-xs text-black/55">Série</dt>
                <dd className="text-2xl font-extrabold tabular-nums">{progress?.streak ?? 0}<span className="text-sm font-medium text-black/55"> j</span></dd>
              </div>
              <div>
                <dt className="text-xs text-black/55">Cartes suivies</dt>
                <dd className="text-2xl font-extrabold tabular-nums">{progress?.tracked ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-black/55">Maîtrisées</dt>
                <dd className="text-2xl font-extrabold tabular-nums">{progress?.mastered ?? 0}</dd>
              </div>
            </dl>

            {logOk ? (
              <>
                <p className="text-sm text-black/60 mb-2">Cartes révisées, {isPro ? "30" : "7"} derniers jours</p>
                <DaysChart counts={counts} label={`Cartes révisées par jour sur les ${isPro ? 30 : 7} derniers jours`} />
              </>
            ) : (
              <p className="text-sm text-black/55">Le détail par jour apparaîtra dès ta première révision.</p>
            )}
          </section>

          {isPro ? (
            <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="hard-title">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 id="hard-title" className="text-xl font-bold tracking-tight">Tes cartes difficiles</h2>
                {successRate !== null && (
                  <p className="text-sm text-black/60 tabular-nums">Réussite : <strong className="text-black">{successRate} %</strong></p>
                )}
              </div>
              {hard.length === 0 ? (
                <p className="text-sm text-black/60">Aucune carte difficile pour l&apos;instant. Elles apparaîtront ici dès que tu en rates.</p>
              ) : (
                <ul className="grid gap-3">
                  {hard.map((h, i) => (
                    <li key={i} className="border-b border-black/10 last:border-0 pb-3 last:pb-0">
                      <p className="font-medium">{h.question}</p>
                      <p className="text-sm text-black/60 mt-0.5">{h.answer}</p>
                      <p className="text-xs text-black/45 mt-1">
                        {h.ficheTitle} · ratée {h.wrong} fois
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="bg-surface border border-black/10 rounded-3xl p-5 sm:p-8" aria-labelledby="hard-title">
              <h2 id="hard-title" className="text-xl font-bold tracking-tight mb-2">Tes cartes difficiles</h2>
              <p className="text-sm text-black/65 mb-4 max-w-[52ch]">
                Avec Pro, FishFlow te montre les cartes que tu rates le plus, ton taux de réussite et ta progression sur
                30 jours, pour savoir quoi retravailler.
              </p>
              <Link href="/pricing" className="ff-secondary text-sm">Voir ce que contient Pro</Link>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
