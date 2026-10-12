import { Fragment, type ReactNode } from "react";
import type { Fiche, FicheBlock } from "@/lib/fiche-engine";

// Affichage de la fiche structurée (nouveau moteur) : titres, gras, surlignage et encadrés.
// Le texte arrive avec un balisage simple (**gras**, ==surligné==) transformé ici en éléments React :
// jamais de HTML injecté.

export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+?\*\*|==[^=]+?==)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold text-black">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          return (
            <mark key={i} className="bg-[#22C55E]/20 text-black rounded px-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
              <RichText text={part.slice(2, -2)} />
            </mark>
          );
        }
        return <Fragment key={i}>{part.replace(/\*\*|==/g, "")}</Fragment>;
      })}
    </>
  );
}

const BOX_LABEL: Record<string, string> = { retenir: "À retenir", piege: "Piège", exemple: "Exemple" };
const BOX_CLASS: Record<string, string> = {
  retenir: "border-[#22C55E]/60",
  piege: "border-black/40",
  exemple: "border-black/10",
};

function Items({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1.5 mt-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" aria-hidden="true" />
          <span>
            <RichText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Block({ block }: { block: FicheBlock }) {
  const items = block.items ?? [];
  if (block.type === "retenir" || block.type === "piege" || block.type === "exemple") {
    return (
      <aside className={`rounded-2xl border bg-surface p-4 ${BOX_CLASS[block.type]}`}>
        <p className={`text-sm font-semibold mb-1 ${block.type === "retenir" ? "text-[#22C55E]" : "text-black"}`}>{BOX_LABEL[block.type]}</p>
        {block.text && (
          <p className="text-black/80">
            <RichText text={block.text} />
          </p>
        )}
        {items.length > 0 && (
          <div className="text-black/80">
            <Items items={items} />
          </div>
        )}
      </aside>
    );
  }
  return (
    <div className="text-black/80 leading-relaxed">
      {block.text && (
        <p>
          <RichText text={block.text} />
        </p>
      )}
      {items.length > 0 && <Items items={items} />}
    </div>
  );
}

export function FicheSectionBody({ blocks }: { blocks: FicheBlock[] }) {
  return (
    <div className="grid gap-3 max-w-[68ch]">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

// Version simple (page de partage) : une carte par partie.
export function FicheContent({ fiche, sectionRef }: { fiche: Fiche; sectionRef?: (i: number, el: HTMLElement | null) => void }) {
  return (
    <div className="grid gap-4">
      {fiche.sections.map((s, i) => (
        <section key={i} ref={sectionRef ? (el) => sectionRef(i, el) : undefined} className="bg-surface rounded-3xl border border-black/10 p-6 sm:p-8">
          <h3 className="text-lg font-bold tracking-tight text-black mb-3">
            <span className="text-[#22C55E] tabular-nums mr-2">{i + 1}.</span>
            {s.title}
          </h3>
          <FicheSectionBody blocks={s.blocks} />
        </section>
      ))}
    </div>
  );
}

export function EssentielList({ lines }: { lines: string[] }): ReactNode {
  return (
    <ol className="grid gap-2 max-w-[68ch]">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3 text-black/80 leading-relaxed text-base sm:text-lg">
          <span className="text-[#22C55E] font-bold tabular-nums shrink-0" aria-hidden="true">{i + 1}.</span>
          <span>
            <RichText text={line} />
          </span>
        </li>
      ))}
    </ol>
  );
}
