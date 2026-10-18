// Supabase pèse lourd (environ 65 Ko compressés). Sur les pages publiques, on ne le télécharge
// qu'au moment où il sert (connexion, inscription, session déjà ouverte), jamais avant l'affichage.
export async function getSupabase() {
  const { createClient } = await import("./client");
  return createClient();
}

// Préchargement discret, une fois la page affichée et le navigateur au repos (formulaires de connexion).
export function preloadSupabase() {
  const load = () => {
    import("./client").catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}
