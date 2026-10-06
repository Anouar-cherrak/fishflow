"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SilverOrb } from "@/components/SilverOrb";
import { trackEvent } from "@/lib/tracking";

type Source = { id: number; title: string; url: string; site: string };
type ImageItem = { src: string; width: number; height: number; alt: string; credit: string; license: string; pageUrl: string };
type Answer = {
  title: string;
  summary: string;
  points: { text: string; sources: number[] }[];
  caution?: string;
  sources: Source[];
  images: ImageItem[];
};

const MAX_QUESTION = 300;
const EXAMPLES = ["Comment fonctionne un trou noir", "Pourquoi le ciel est bleu", "Histoire du café"];

// Une couleur différente par question : même question = même couleur.
function hueFromText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}

export default function Apprendre() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "empty" | "error" | "pro">("idle");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [shift, setShift] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Les images partent du centre de la boule et volent jusqu'à leur place.
  const imagesRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = imagesRef.current;
    if (!list || status !== "done") return;
    const slot = document.querySelector<HTMLElement>(".ff-silver-slot, .ff-orb");
    const from = slot?.getBoundingClientRect();
    list.querySelectorAll<HTMLElement>("li.ff-fly").forEach((li, i) => {
      if (from) {
        const to = li.getBoundingClientRect();
        li.style.setProperty("--fx", `${from.left + from.width / 2 - (to.left + to.width / 2)}px`);
        li.style.setProperty("--fy", `${from.top + from.height / 2 - (to.top + to.height / 2)}px`);
      }
      li.style.setProperty("--fr", `${(i - 1) * 14}deg`);
      li.style.animationDelay = `${0.2 + i * 0.18}s`;
      li.classList.add("ff-fly-go");
    });
  }, [status, answer]);

  // On annule la requête en cours si on quitte la page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Quand la réponse arrive, le focus va sur son titre (lecteurs d'écran et clavier).
  useEffect(() => {
    if (status === "done") titleRef.current?.focus();
  }, [status]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || status === "loading") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAsked(trimmed);
    setShift(hueFromText(trimmed));
    setStatus("loading");
    setMessage("");
    setAnswer(null);
    trackEvent("apprendre_question");

    try {
      const res = await fetch("/api/apprendre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
        signal: controller.signal,
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 403 && data.code === "pro_required") {
        setStatus("pro");
        setMessage(data.error ?? "");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Une erreur est survenue. Réessaie.");
        return;
      }
      if (!data.found) {
        setMessage(typeof data.message === "string" ? data.message : "");
        setStatus("empty");
        return;
      }

      setAnswer(data as Answer);
      setStatus("done");
      trackEvent("apprendre_reponse", { sources: data.sources?.length ?? 0 });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setStatus("error");
      setMessage("Connexion impossible. Vérifie ta connexion et réessaie.");
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  const showResult = status !== "idle";

  return (
    <>
      <AppShell size="normal">
      <div className="relative z-[1] w-full max-w-2xl mx-auto pt-2 pb-44 flex flex-col items-center">
        <div className={showResult ? "mb-6" : "mt-6 mb-8"}>
          <SilverOrb thinking={status === "loading"} done={status === "done"} compact={showResult} shift={shift} />
        </div>

        {!showResult && (
          <div className="text-center ff-fade-up">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Que veux-tu savoir ?</h1>
            <p className="text-black/60 text-sm sm:text-base max-w-sm mx-auto mb-6">
              Pose une question. Tu reçois une réponse claire et bien expliquée, des images et des liens pour aller plus loin.
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestion(example);
                      ask(example);
                    }}
                    className="min-h-[44px] px-4 rounded-full border border-black/15 text-sm text-black/70 hover:text-black hover:bg-surface transition"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div aria-live="polite" className="w-full">
          {status === "loading" && (
            <p className="text-center text-black/60 text-sm ff-fade">Je réfléchis à ta question…</p>
          )}

          {status === "empty" && (
            <div className="bg-surface border border-black/10 rounded-2xl p-6 text-center ff-fade-up">
              <p className="font-medium mb-1">Je ne peux pas répondre à celle-ci.</p>
              <p className="text-sm text-black/60">
                {message || "Essaie avec une vraie question de culture ou de cours, par exemple « Comment fonctionne un trou noir ? »."}
              </p>
            </div>
          )}

          {status === "error" && (
            <p role="alert" className="bg-surface border border-black/10 rounded-2xl p-4 text-sm text-center ff-fade-up">
              {message}
            </p>
          )}

          {status === "pro" && (
            <div className="bg-surface border border-black/10 rounded-2xl p-6 text-center ff-fade-up">
              <p className="font-medium mb-1">{message || "Cette fonctionnalité est réservée aux Pro."}</p>
              <p className="text-sm text-black/60 mb-4">Tu as eu un essai gratuit. Avec Pro, tu apprends sans limite.</p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-[#22C55E] text-[#04130A] text-sm font-semibold hover:bg-[#16A34A] transition ff-btn"
              >
                Voir Pro
              </Link>
            </div>
          )}

          {status === "done" && answer && (
            <article className="w-full">
              <p className="text-xs text-black/40 mb-1">Ta question : {asked}</p>
              <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-semibold mb-3 outline-none ff-fade-up">
                {answer.title}
              </h1>
              <p className="text-black/80 mb-6 ff-fade-up" style={{ animationDelay: "0.35s" }}>
                {answer.summary}
              </p>

              {answer.images.length > 0 && (
                <ul ref={imagesRef} className="grid grid-cols-2 min-[640px]:grid-cols-3 gap-3 mb-8">
                  {answer.images.map((image) => (
                    <li
                      key={image.src}
                      className="ff-fly"
                    >
                      <figure className="rounded-xl overflow-hidden border border-black/10 bg-surface h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.src}
                          alt={image.alt}
                          width={image.width}
                          height={image.height}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-32 object-cover"
                        />
                        <figcaption className="px-2 py-1.5 text-[11px] leading-snug text-black/50">
                          <a
                            href={image.pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-black"
                          >
                            {image.credit} · {image.license}
                          </a>
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              )}

              {answer.images.length === 0 && (
                <p className="text-sm text-black/50 mb-8 border border-dashed border-black/15 rounded-xl px-4 py-3">
                  Pas d&apos;image libre de droits pour ce sujet. Les sources ci-dessous restent à ta disposition.
                </p>
              )}

              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40 mb-3">À retenir</h2>
              <ul className="space-y-3 mb-8">
                {answer.points.map((point, i) => (
                  <li
                    key={i}
                    className="bg-surface border border-black/10 rounded-xl p-4 ff-fade-up"
                    style={{ animationDelay: `${0.5 + i * 0.12}s` }}
                  >
                    <p className="text-sm sm:text-base text-black/85">
                      {point.text}{" "}
                      {point.sources.map((id) => (
                        <a
                          key={id}
                          href={`#source-${id}`}
                          className="inline-block text-xs font-medium text-[#16A34A] px-1 hover:underline"
                          aria-label={`Source ${id}`}
                        >
                          [{id}]
                        </a>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>

              {answer.caution && (
                <p className="text-sm text-black/70 border border-black/15 rounded-xl px-4 py-3 mb-6">{answer.caution}</p>
              )}

              {answer.sources.length > 0 && (
              <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40 mb-3">Pour aller plus loin</h2>
              <ol className="space-y-2 mb-4">
                {answer.sources.map((source) => (
                  <li key={source.id} id={`source-${source.id}`} className="text-sm scroll-mt-20">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black underline underline-offset-2 hover:text-[#16A34A]"
                    >
                      {source.title} — {source.site}
                    </a>
                  </li>
                ))}
              </ol>
              </>
              )}
              <p className="text-xs text-black/50">
                Réponse écrite par l&apos;IA à partir de ses connaissances. Elle peut se tromper : vérifie les infos importantes, par exemple dans les articles ci-dessus.
              </p>
            </article>
          )}
        </div>
      </div>
      </AppShell>

      <form
        onSubmit={onSubmit}
        className="fixed bottom-0 inset-x-0 z-10 bg-white/90 backdrop-blur border-t border-black/10 lg:px-8 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <label htmlFor="question" className="sr-only">
            Ta question
          </label>
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={MAX_QUESTION}
            placeholder="Que veux-tu savoir ?"
            autoComplete="off"
            enterKeyHint="send"
            className="ff-input flex-1 min-w-0 min-h-[48px] rounded-full border border-black/15 bg-surface px-4 text-black placeholder:text-black/40 focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/30"
          />
          <button
            type="submit"
            disabled={status === "loading" || question.trim().length < 3}
            className="min-h-[48px] px-5 rounded-full bg-[#22C55E] text-[#04130A] text-sm font-semibold hover:bg-[#16A34A] transition disabled:opacity-40 ff-btn shrink-0"
          >
            {status === "loading" ? "…" : "Envoyer"}
          </button>
        </div>
      </form>
    </>
  );
}
