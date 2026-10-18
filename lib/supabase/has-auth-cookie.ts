// Vrai si le navigateur a un cookie de session Supabase (« sb-…-auth-token », parfois coupé en « .0 », « .1 »).
// Sans ce cookie, personne n'est connecté : inutile de charger Supabase ou d'appeler une route du compte.
export function hasAuthCookie(): boolean {
  try {
    return /(?:^|;\s*)sb-[^=]*-auth-token(?:\.\d+)?=/.test(document.cookie);
  } catch {
    return false;
  }
}
