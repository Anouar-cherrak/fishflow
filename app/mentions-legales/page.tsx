import { AppShell } from "@/components/AppShell";

export default function MentionsLegales() {
  return (
    <AppShell size="form">
      <article>
        <h1 className="ff-title mb-8">Mentions légales</h1>

        <div className="space-y-8 text-base text-black/75 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">Éditeur du site</h2>
            <p>
              Le site FishFlow (ficheflow.fr) est édité par :<br />
              CHERRAK Anouar<br />
              Statut : Entrepreneur individuel (micro-entreprise)<br />
              Numéro SIRET : 943 781 740 00015<br />
              Adresse : 261 rue de Bâle, 68100 Mulhouse, France<br />
              Email de contact : anouarcherrak68100@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">Directeur de la publication</h2>
            <p>CHERRAK Anouar</p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">Hébergement</h2>
            <p>
              Le site est hébergé par :<br />
              Vercel Inc.<br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              vercel.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, structure, design, logo) est la propriété de
              CHERRAK Anouar, sauf mention contraire. Toute reproduction non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">Contact</h2>
            <p>
              Pour toute question relative à ces mentions légales, tu peux nous contacter à l'adresse :{" "}
              anouarcherrak68100@gmail.com
            </p>
          </section>

          <p className="text-sm text-black/50 pt-6 border-t border-black/10">
            Dernière mise à jour : 11/08/2026
          </p>
        </div>
      </article>
    </AppShell>
  );
}