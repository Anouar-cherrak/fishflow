"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getStreak, REVIEWED_EVENT } from "@/lib/reviews";

export type FlameState = "lit" | "waiting" | "out";

// La flamme dessinée : trois couches (bord rouge-orangé, cœur orange, centre jaune) qui ondulent
// chacune à leur rythme, quelques étincelles qui montent, et une lueur. Animations coupées si
// la personne a demandé moins de mouvement.
export function FlameIcon({ state, size = 24, pop = false }: { state: FlameState; size?: number; pop?: boolean }) {
  const id = useId().replace(/:/g, "");
  const out = state === "out";
  return (
    <svg
      viewBox="0 0 32 40"
      width={size}
      height={(size * 40) / 32}
      className={`ff-flame${pop ? " ff-flame-pop" : ""}`}
      data-state={state}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}o`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="0.6" stopColor="#F97316" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FDE047" />
          <stop offset="1" stopColor="#FB923C" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFBEB" />
          <stop offset="1" stopColor="#FDE047" />
        </linearGradient>
      </defs>
      {!out && (
        <g className="ff-flame-sparks">
          <circle cx="11" cy="14" r="1.1" fill="#FDBA74" />
          <circle cx="21" cy="11" r="0.9" fill="#FDE047" />
          <circle cx="17" cy="8" r="0.8" fill="#FB923C" />
        </g>
      )}
      <path
        className="ff-flame-outer"
        fill={out ? "currentColor" : `url(#${id}o)`}
        opacity={out ? 0.3 : 1}
        d="M16 1.5C17.5 8 26 12.5 26 24.5C26 32.5 21.5 38.5 16 38.5C10.5 38.5 6 32.5 6 25C6 19.5 9 16 11 12.5C11.8 16 13 18 15 19C14.2 13 14.5 7 16 1.5Z"
      />
      {!out && (
        <>
          <path
            className="ff-flame-mid"
            fill={`url(#${id}m)`}
            d="M16 12C17 17 22 19.5 22 27C22 32.5 19.3 36 16 36C12.7 36 10 32.5 10 28C10 24.5 12 22.5 13.2 20.5C13.8 23 14.8 24.3 16 25C15.5 21 15.2 16 16 12Z"
          />
          <path
            className="ff-flame-core"
            fill={`url(#${id}c)`}
            d="M16 22C17 25.5 19.5 27.5 19.5 31C19.5 34 18 35.8 16 35.8C14 35.8 12.5 34 12.5 31.5C12.5 29 14.5 27 16 22Z"
          />
        </>
      )}
    </svg>
  );
}

export function flameLabel(streak: number, activeToday: boolean): string {
  if (streak === 0) return "Pas de série en cours : révise aujourd'hui pour allumer la flamme.";
  const jours = `${streak} jour${streak > 1 ? "s" : ""} d'affilée`;
  return activeToday ? `Série de ${jours}. Tu as révisé aujourd'hui.` : `Série de ${jours}. Révise aujourd'hui pour la garder.`;
}

export function flameState(streak: number, activeToday: boolean): FlameState {
  if (streak === 0) return "out";
  return activeToday ? "lit" : "waiting";
}

const CACHE_KEY = "ff-streak";
const CACHE_MS = 2 * 60 * 1000;

// Flamme de série dans la barre du haut : allumée si on a révisé aujourd'hui, plus faible si la série
// attend la révision du jour, éteinte s'il n'y a pas de série. Elle se rallume en direct après une révision.
export function StreakFlame() {
  const [data, setData] = useState<{ streak: number; activeToday: boolean } | null>(null);
  const [pop, setPop] = useState(false);
  const previous = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: { streak: number; activeToday: boolean }) => {
      if (cancelled) return;
      // La flamme « s'allume » avec un petit effet quand la première révision du jour arrive.
      if (previous.current === false && next.activeToday) {
        setPop(true);
        setTimeout(() => setPop(false), 900);
      }
      previous.current = next.activeToday;
      setData(next);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, at: Date.now() }));
      } catch {}
    };

    const load = () => getStreak().then(apply);

    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.at < CACHE_MS && new Date(cached.at).toDateString() === new Date().toDateString()) {
        queueMicrotask(() => apply({ streak: cached.streak, activeToday: cached.activeToday }));
      } else {
        load();
      }
    } catch {
      load();
    }

    // Après une révision, on attend un instant que l'enregistrement soit fait, puis on relit la série.
    const onReviewed = () => setTimeout(load, 600);
    window.addEventListener(REVIEWED_EVENT, onReviewed);
    return () => {
      cancelled = true;
      window.removeEventListener(REVIEWED_EVENT, onReviewed);
    };
  }, []);

  if (!data) return null;
  const state = flameState(data.streak, data.activeToday);
  const label = flameLabel(data.streak, data.activeToday);

  return (
    <Link
      href={data.activeToday ? "/aujourdhui" : "/reviser"}
      className="ff-streak"
      data-state={state}
      aria-label={label}
      title={label}
    >
      <FlameIcon state={state} size={18} pop={pop} />
      <span className="tabular-nums">{data.streak}</span>
    </Link>
  );
}
