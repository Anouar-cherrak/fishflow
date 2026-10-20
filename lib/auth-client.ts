// Appel des routes /api/auth/… depuis les pages de connexion et d'inscription.
// Le serveur vérifie tout (blocage après plusieurs erreurs, limites d'emails) et renvoie un message prêt à afficher.
export type AuthResult = { ok: boolean; error?: string; message?: string; field?: "email" | "password" };

export async function postAuth(action: "login" | "signup" | "verify" | "resend" | "reset", body: Record<string, string>): Promise<AuthResult> {
  try {
    const res = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<AuthResult>;
    if (res.ok) return { ok: true, message: data.message };
    return { ok: false, error: data.error ?? "Ça n'a pas marché. Réessaie dans un instant.", field: data.field };
  } catch {
    return { ok: false, error: "Pas de connexion à Internet. Vérifie ton réseau, puis réessaie." };
  }
}
