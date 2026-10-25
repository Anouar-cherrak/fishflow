# Activer « Continuer avec Google »

Le code est prêt, mais le bouton reste **caché** tant que tu n'as pas fait les étapes ci-dessous.
Aucune clé n'est écrite ici : tu les copies toi-même d'un tableau de bord à l'autre.

Adresse de ton projet Supabase (lue dans `NEXT_PUBLIC_SUPABASE_URL`) : `https://doastwnzeoltlwowmygj.supabase.co`

## 1. Google Cloud (console.cloud.google.com)

1. Crée un projet (ou prends-en un), par exemple « FishFlow ».
2. **API et services → Écran de consentement OAuth** (« Google Auth Platform ») :
   - Type d'utilisateur : **Externe**
   - Nom de l'application : `FishFlow`
   - E-mail d'assistance : ton adresse
   - Logo : facultatif (un logo demande une validation de Google, plus longue). Tu peux t'en passer au début.
   - Page d'accueil : `https://fishflow.fr`
   - Règles de confidentialité : `https://fishflow.fr/confidentialite`
   - Conditions d'utilisation : `https://fishflow.fr/cgu`
   - Domaines autorisés : `fishflow.fr` (et `supabase.co` si Google le demande)
   - Accès demandés (scopes) : seulement `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (rien d'autre : pas de validation lourde)
   - **Publie l'application** (« En production »). Sinon, seuls les comptes « testeurs » que tu ajoutes peuvent se connecter.
3. **Identifiants → Créer des identifiants → ID client OAuth** :
   - Type : **Application Web**
   - Origines JavaScript autorisées : `https://fishflow.fr`, `https://www.fishflow.fr`, `http://localhost:3000`
   - **URI de redirection autorisés** (une seule, celle de Supabase) :
     `https://doastwnzeoltlwowmygj.supabase.co/auth/v1/callback`
4. Google te donne un **ID client** et un **code secret client**. Garde-les pour l'étape 2 (ne les mets jamais dans le projet).

## 2. Supabase (supabase.com → projet fishflow)

1. **Authentication → Sign In / Providers → Google** : active-le, colle l'ID client et le code secret client, enregistre.
2. **Authentication → URL Configuration** :
   - Site URL : `https://fishflow.fr`
   - Redirect URLs (ajoute les trois, avec les deux étoiles à la fin) :
     - `https://fishflow.fr/auth/callback**`
     - `https://www.fishflow.fr/auth/callback**`
     - `http://localhost:3000/auth/callback**`
   - Garde les adresses déjà présentes (par exemple celle du mot de passe oublié `/reset-password/confirm`).
3. Ne touche pas à « Manual linking » ni à « Allow unverified email sign-ins » : laisse-les **désactivés**.

## 3. Vercel (projet fishflow → Settings → Environment Variables)

1. Ajoute `NEXT_PUBLIC_GOOGLE_LOGIN` = `oui` (Production).
2. **Redéploie** (Deployments → les trois points du dernier → Redeploy) : cette variable est lue au moment de la construction du site.

Pour cacher le bouton plus tard : supprime la variable (ou mets autre chose que `oui`) et redéploie.

## 4. Ce qu'il faut tester une fois tout configuré

1. Sur fishflow.fr/login, en navigation privée : le bouton « Continuer avec Google » est là, avec le logo.
2. Clic → page Google → choisis un compte **qui n'a jamais utilisé FishFlow** → tu arrives sur /generer, connecté.
   Paramètres affiche bien l'adresse, le plan gratuit et le compteur de fiches.
3. Génère une fiche : le quota gratuit se décompte normalement.
4. Déconnecte-toi, reconnecte-toi avec Google : même compte, mêmes fiches.
5. Clic sur le bouton puis **Annuler** chez Google → retour sur /login avec « Connexion avec Google annulée ».
6. Avec un compte e-mail + mot de passe **déjà confirmé** et la même adresse Gmail : connexion Google → tu retrouves les fiches de ce compte (même compte, pas de doublon). Le mot de passe marche toujours.
7. Sur une fiche partagée (/p/…), « Copier dans mes fiches » sans être connecté → Google → la copie se fait bien au retour.
8. Sur téléphone : même chose (l'appli installée sur l'écran d'accueil peut ouvrir Google dans le navigateur : vérifie que tu reviens bien connecté).
9. Paramètres → « Changer le mot de passe » sur un compte Google : ça lui ajoute un mot de passe (normal, il pourra aussi se connecter par e-mail).
10. Export des données et suppression du compte : à tester sur un compte Google jetable.
